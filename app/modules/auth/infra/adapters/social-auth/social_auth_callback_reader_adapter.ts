import { socialAuthConfig } from '#config/social_auth'
import type { SocialAuthCallbackSource } from '#modules/auth/actions/dtos/request/social-auth/social_auth_callback_source'
import {
  SocialAuthCallbackReader,
  SOCIAL_AUTH_FAILURE_CODES,
  type ReadSocialAuthCallbackResult,
  type SocialAuthFailureResult,
} from '#modules/auth/actions/ports/outbound/social-auth/social_auth_callback_reader'
import type { SupportedSocialAuthProvider } from '#modules/auth/domain/social-auth/social_auth_provider'
import * as AuthLogger from '#modules/auth/observability/auth_logger'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'

type OptionalPayloadKeys<T extends object> = {
  [Key in keyof T]-?: undefined extends T[Key] ? Key : never
}[keyof T]

type OmittedUndefined<T extends object> = {
  [Key in keyof T as Key extends OptionalPayloadKeys<T> ? never : Key]: T[Key]
} & {
  [Key in OptionalPayloadKeys<T>]?: Exclude<T[Key], undefined>
}

function omitUndefined<T extends object>(value: T): OmittedUndefined<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  ) as OmittedUndefined<T>
}


interface SocialAuthCallbackReaderAdapterOptions {
  userTimeoutMs?: number
}

class SocialAuthProviderTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`OAuth provider user request exceeded ${timeoutMs}ms`)
    this.name = 'SocialAuthProviderTimeoutError'
  }
}

class InvalidSocialAuthProviderResponseError extends Error {
  constructor() {
    super('OAuth provider returned an invalid user response')
    this.name = 'InvalidSocialAuthProviderResponseError'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function toOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined
}

function toNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

export default class SocialAuthCallbackReaderAdapter extends SocialAuthCallbackReader {
  private readonly userTimeoutMs: number

  constructor(options: SocialAuthCallbackReaderAdapterOptions = {}) {
    super()
    this.userTimeoutMs = options.userTimeoutMs ?? socialAuthConfig.providerRequestTimeoutMs
    if (
      !Number.isSafeInteger(this.userTimeoutMs) ||
      this.userTimeoutMs < 1 ||
      this.userTimeoutMs > 60_000
    ) {
      throw new RangeError('userTimeoutMs must be an integer between 1 and 60000')
    }
  }

  async readCallback(
    provider: SupportedSocialAuthProvider,
    socialAuth: SocialAuthCallbackSource
  ): Promise<ReadSocialAuthCallbackResult> {
    const transportFailure = this.getTransportFailure(provider, socialAuth)
    if (transportFailure) {
      return transportFailure
    }

    return this.readSocialUser(provider, socialAuth)
  }

  private getTransportFailure(
    provider: SupportedSocialAuthProvider,
    socialAuth: SocialAuthCallbackSource
  ): SocialAuthFailureResult | null {
    if (socialAuth.accessDenied()) {
      AuthLogger.oauthStateError(provider, 'access_denied')
      return {
        type: 'error',
        publicCode: SOCIAL_AUTH_FAILURE_CODES.ACCESS_DENIED,
        safeMessage: 'Truy cập bị từ chối',
      }
    }

    if (socialAuth.stateMisMatch()) {
      AuthLogger.oauthStateError(provider, 'state_mismatch')
      return {
        type: 'error',
        publicCode: SOCIAL_AUTH_FAILURE_CODES.STATE_MISMATCH,
        safeMessage: 'Phiên xác thực không hợp lệ',
      }
    }

    if (!socialAuth.hasError()) {
      return null
    }

    const providerError = socialAuth.getError()
    AuthLogger.oauthError(provider, providerError, 'callback-error')

    return {
      type: 'error',
      publicCode: SOCIAL_AUTH_FAILURE_CODES.PROVIDER_FAILURE,
      safeMessage: ErrorMessages.SERVICE_UNAVAILABLE,
    }
  }

  private async readSocialUser(
    provider: SupportedSocialAuthProvider,
    socialAuth: SocialAuthCallbackSource
  ): Promise<ReadSocialAuthCallbackResult> {
    let socialUserRaw: unknown
    try {
      socialUserRaw = await this.withUserDeadline(socialAuth.user())
    } catch (error) {
      AuthLogger.oauthError(provider, error, 'user-fetch-failed')
      return this.providerFailure()
    }

    if (!isRecord(socialUserRaw)) {
      AuthLogger.oauthError(
        provider,
        new InvalidSocialAuthProviderResponseError(),
        'invalid-user-response'
      )
      return this.providerFailure()
    }

    const socialUser = this.buildNormalizedSocialUser(socialUserRaw)
    AuthLogger.oauthUserReceived(
      provider,
      omitUndefined({
        id: socialUser.id,
        email: socialUser.email,
        name: socialUser.name,
        nickName: socialUser.nickName ?? undefined,
        token: socialUser.refreshToken ? { refreshToken: socialUser.refreshToken } : undefined,
      })
    )

    if (!socialUser.email) {
      AuthLogger.oauthError(provider, new Error('No email from provider'), 'no-email')
      return {
        type: 'error',
        publicCode: SOCIAL_AUTH_FAILURE_CODES.EMAIL_UNAVAILABLE,
        safeMessage: 'Email không được cung cấp từ nhà cung cấp',
      }
    }

    if (!socialUser.token) {
      AuthLogger.oauthError(provider, new Error('No access token from provider'), 'no-token')
      return {
        type: 'error',
        publicCode: SOCIAL_AUTH_FAILURE_CODES.INVALID_SESSION,
        safeMessage: 'Phiên xác thực không hợp lệ, vui lòng thử lại',
      }
    }

    return {
      type: 'success',
      socialUser: {
        ...socialUser,
        email: socialUser.email,
        token: socialUser.token,
      },
    }
  }

  private buildNormalizedSocialUser(socialUserRaw: Record<string, unknown>) {
    const tokenRaw = isRecord(socialUserRaw['token']) ? socialUserRaw['token'] : null
    const accessTokenRaw =
      tokenRaw?.['token'] ??
      tokenRaw?.['accessToken'] ??
      tokenRaw?.['access_token'] ??
      socialUserRaw['token'] ??
      socialUserRaw['accessToken'] ??
      socialUserRaw['access_token']
    const refreshTokenRaw =
      tokenRaw?.['refreshToken'] ??
      tokenRaw?.['refresh_token'] ??
      socialUserRaw['refreshToken'] ??
      socialUserRaw['refresh_token']
    const socialIdRaw = socialUserRaw['id']
    const socialId =
      typeof socialIdRaw === 'string' || typeof socialIdRaw === 'number' ? String(socialIdRaw) : ''

    return {
      id: socialId,
      email: toNullableString(socialUserRaw['email']),
      name: toOptionalString(socialUserRaw['name']) ?? 'OAuth User',
      nickName: toNullableString(socialUserRaw['nickName']),
      token: toOptionalString(accessTokenRaw),
      refreshToken: toNullableString(refreshTokenRaw),
    }
  }

  private providerFailure(): SocialAuthFailureResult {
    return {
      type: 'error',
      publicCode: SOCIAL_AUTH_FAILURE_CODES.PROVIDER_FAILURE,
      safeMessage: ErrorMessages.SERVICE_UNAVAILABLE,
    }
  }

  private withUserDeadline<T>(operation: Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new SocialAuthProviderTimeoutError(this.userTimeoutMs))
      }, this.userTimeoutMs)

      operation.then(
        (value) => {
          clearTimeout(timeout)
          resolve(value)
        },
        (error: unknown) => {
          clearTimeout(timeout)
          reject(error)
        }
      )
    })
  }
}
