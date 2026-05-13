import BusinessLogicException from '#exceptions/business_logic_exception'
import * as AuthLogger from '#infra/logger/auth_logger'
import { ErrorMessages } from '#modules/errors/constants/error_constants'

export type SupportedSocialAuthProvider = 'google' | 'github'

export interface SocialAuthDriver {
  accessDenied(): boolean
  stateMisMatch(): boolean
  hasError(): boolean
  getError(): unknown
  user(): Promise<unknown>
}

export interface SocialAuthFailureResult {
  type: 'error'
  errorMessage: string
}

export interface NormalizedSocialAuthUser {
  id: string
  email: string
  name: string
  nickName: string | null
  token: string
  refreshToken: string | null
}

export interface SocialAuthSuccessResult {
  type: 'success'
  socialUser: NormalizedSocialAuthUser
}

export type ReadSocialAuthCallbackResult = SocialAuthFailureResult | SocialAuthSuccessResult

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function toOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined
}

function toNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

export default class SocialAuthProviderService {
  async readCallback(
    provider: SupportedSocialAuthProvider,
    socialAuth: SocialAuthDriver
  ): Promise<ReadSocialAuthCallbackResult> {
    const transportFailure = this.getTransportFailure(provider, socialAuth)
    if (transportFailure) {
      return transportFailure
    }

    return this.readSocialUser(provider, socialAuth)
  }

  private getTransportFailure(
    provider: SupportedSocialAuthProvider,
    socialAuth: SocialAuthDriver
  ): SocialAuthFailureResult | null {
    if (socialAuth.accessDenied()) {
      AuthLogger.oauthStateError(provider, 'access_denied')
      return {
        type: 'error',
        errorMessage: 'Truy cập bị từ chối',
      }
    }

    if (socialAuth.stateMisMatch()) {
      AuthLogger.oauthStateError(provider, 'state_mismatch')
      return {
        type: 'error',
        errorMessage: 'Phiên xác thực không hợp lệ',
      }
    }

    if (!socialAuth.hasError()) {
      return null
    }

    const errorMessage = String(socialAuth.getError())
    AuthLogger.oauthError(provider, errorMessage, 'callback-error')

    return {
      type: 'error',
      errorMessage,
    }
  }

  private async readSocialUser(
    provider: SupportedSocialAuthProvider,
    socialAuth: SocialAuthDriver
  ): Promise<ReadSocialAuthCallbackResult> {
    const socialUserRaw = await socialAuth.user()
    if (!isRecord(socialUserRaw)) {
      throw new BusinessLogicException(ErrorMessages.INVALID_INPUT)
    }

    const socialUser = this.buildNormalizedSocialUser(socialUserRaw)
    AuthLogger.oauthUserReceived(provider, {
      id: socialUser.id,
      email: socialUser.email,
      name: socialUser.name,
      nickName: socialUser.nickName ?? undefined,
      token: socialUser.refreshToken ? { refreshToken: socialUser.refreshToken } : undefined,
    })

    if (!socialUser.email) {
      AuthLogger.oauthError(provider, new Error('No email from provider'), 'no-email')
      return {
        type: 'error',
        errorMessage: 'Email không được cung cấp từ nhà cung cấp',
      }
    }

    if (!socialUser.token) {
      AuthLogger.oauthError(provider, new Error('No access token from provider'), 'no-token')
      return {
        type: 'error',
        errorMessage: 'Phiên xác thực không hợp lệ, vui lòng thử lại',
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
    const tokenRaw = isRecord(socialUserRaw.token) ? socialUserRaw.token : null
    const socialIdRaw = socialUserRaw.id
    const socialId =
      typeof socialIdRaw === 'string' || typeof socialIdRaw === 'number' ? String(socialIdRaw) : ''

    return {
      id: socialId,
      email: toNullableString(socialUserRaw.email),
      name: toOptionalString(socialUserRaw.name) ?? 'OAuth User',
      nickName: toNullableString(socialUserRaw.nickName),
      token: toOptionalString(tokenRaw?.token),
      refreshToken: toNullableString(tokenRaw?.refreshToken),
    }
  }
}
