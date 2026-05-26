import type SocialLoginCommand from './social_login_command.js'

import { BaseCommand } from '#modules/auth/actions/base_command'
import type { AuthActionContext } from '#modules/auth/actions/auth_action_context'
import type { SocialAuthCallbackSource } from '#modules/auth/actions/dtos/request/social-auth/social_auth_callback_source'
import type { AuthEventIdentityGenerator } from '#modules/auth/actions/ports/outbound/auth_event_identity_generator'
import type { AuthSessionObservationStager } from '#modules/auth/actions/ports/outbound/auth_session_observation_stager'
import type {
  SocialAuthCallbackReader,
  SocialAuthFailureResult,
} from '#modules/auth/actions/ports/outbound/social-auth/social_auth_callback_reader'
import type { SocialLoginIdentity as SocialAuthenticatedUser } from '#modules/auth/actions/ports/outbound/social-auth/social_login_identity_persistence'
import type {
  SocialWebSessionHandle,
  SocialWebSessionLogin,
} from '#modules/auth/actions/ports/outbound/social_web_session_login'
import type { SupportedSocialAuthProvider } from '#modules/auth/domain/social-auth/social_auth_provider'
import loggerService from '#modules/logger/public_contracts/application_logger'

interface SocialAuthSuccessResult {
  type: 'success'
  user: SocialAuthenticatedUser
  redirectTo: string
  currentOrganizationId: SocialAuthenticatedUser['current_organization_id'] | null
}

export type ProcessSocialAuthCallbackResult = SocialAuthFailureResult | SocialAuthSuccessResult

export interface ProcessSocialAuthCallbackInput {
  context: AuthActionContext
  provider: SupportedSocialAuthProvider
  socialAuth: SocialAuthCallbackSource
  webSession: SocialWebSessionHandle
}

export default class ProcessSocialAuthCallbackCommand extends BaseCommand<
  ProcessSocialAuthCallbackInput,
  ProcessSocialAuthCallbackResult
> {
  constructor(
    private readonly callbackReader: SocialAuthCallbackReader,
    private readonly socialLogin: SocialLoginCommand,
    private readonly webSessionLogin: SocialWebSessionLogin,
    private readonly sessionObservations: AuthSessionObservationStager,
    private readonly eventIdentities: AuthEventIdentityGenerator
  ) {
    super()
  }

  async handle(input: ProcessSocialAuthCallbackInput): Promise<ProcessSocialAuthCallbackResult> {
    return this.execute(input)
  }

  async execute(input: ProcessSocialAuthCallbackInput): Promise<ProcessSocialAuthCallbackResult> {
    const callbackData = await this.callbackReader.readCallback(input.provider, input.socialAuth)
    if (callbackData.type === 'error') {
      return callbackData
    }

    const result = await this.socialLogin.execute(input.provider, callbackData.socialUser)
    await this.webSessionLogin.login(
      input.webSession,
      result.user.id,
      true,
      result.user.current_organization_id ?? null
    )

    const eventIdentity = this.eventIdentities.next()
    await this.settlePostCommitEffect(
      'auth.login.durable_stage',
      () =>
        this.sessionObservations.stage({
          eventId: eventIdentity.eventId,
          userId: result.user.id,
          action: 'login',
          occurredAt: eventIdentity.occurredAt,
          ipAddress: input.context.ip,
          userAgent: input.context.userAgent,
          method: 'oauth',
          requestId: input.context.requestId ?? null,
          traceId: input.context.traceId ?? null,
        }),
      {
        userId: result.user.id,
        eventId: eventIdentity.eventId,
      }
    )

    return {
      type: 'success',
      user: result.user,
      redirectTo: result.redirectTo,
      currentOrganizationId: result.user.current_organization_id ?? null,
    }
  }

  private async settlePostCommitEffect(
    effectName: string,
    effect: () => Promise<void>,
    context: { userId: string; eventId?: string }
  ): Promise<void> {
    try {
      await effect()
    } catch (error) {
      try {
        loggerService.error('Auth post-commit effect failed', {
          effectName,
          committed: true,
          userId: context.userId,
          ...(context.eventId ? { eventId: context.eventId } : {}),
          errorName: error instanceof Error ? error.name : 'UnknownError',
        })
      } catch {
        // Telemetry failure must never alter the completed authentication operation.
      }
    }
  }
}
