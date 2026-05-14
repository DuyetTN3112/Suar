import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import {
  buildSocialAuthRedirectLogContext,
  buildSupportedSocialAuthProvider,
} from '../mappers/request/social-auth/social_auth_request_mapper.js'
import {
  mapSocialAuthErrorRedirect,
  mapSocialAuthFailureEventError,
  mapSocialAuthSuccessRedirect,
} from '../mappers/response/social-auth/social_auth_response_mapper.js'

import ProcessSocialAuthCallbackCommand from '#modules/auth/actions/commands/process_social_auth_callback_command'
import type { SocialAuthCallbackSource } from '#modules/auth/actions/dtos/request/social_auth_callback_source'
import {
  type SocialAuthCallbackConfigurableDriver,
  SocialAuthTransportConfigurator,
} from '#modules/auth/controllers/ports/social-auth/social_auth_transport_configurator'
import { buildAuthLoginEvent } from '#modules/auth/observability/auth_event_factory'
import * as AuthLogger from '#modules/auth/observability/auth_logger'
import { optionalActionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { PLATFORM_EVENT_NAMES } from '#modules/observability/public_contracts/platform_event_names'
import {
  platformOperationalLogger,
  platformWorkflowLogger,
} from '#modules/observability/public_contracts/platform_observability'

interface SocialAuthRedirectDriver
  extends SocialAuthCallbackSource, SocialAuthCallbackConfigurableDriver {
  redirect(): Promise<void>
}

@inject()
export default class SocialAuthController {
  constructor(
    private readonly processCallback: ProcessSocialAuthCallbackCommand,
    private readonly transportConfiguration: SocialAuthTransportConfigurator
  ) {}

  /**
   * Chuyển hướng người dùng đến trang đăng nhập của nhà cung cấp
   */
  async redirect({ params, ally, request, response, session }: HttpContext) {
    const provider = buildSupportedSocialAuthProvider(params['provider'] as string)

    const host = request.header('host') ?? 'localhost:3333'
    const canonicalLocalRedirect = this.transportConfiguration.canonicalLocalRedirect(
      provider,
      host
    )
    if (canonicalLocalRedirect) {
      response.redirect().toPath(canonicalLocalRedirect)
      return
    }

    // Ensure session cookie is established before cross-site OAuth redirect
    session.put('oauth_provider', provider)

    const socialAuth = ally.use(provider) as unknown as SocialAuthRedirectDriver
    const callbackConfiguration = this.transportConfiguration.configureCallback(
      provider,
      host,
      socialAuth
    )
    AuthLogger.configCheck(
      provider,
      callbackConfiguration.hasClientId,
      callbackConfiguration.hasClientSecret,
      callbackConfiguration.callbackUrl
    )
    AuthLogger.oauthRedirect(provider, buildSocialAuthRedirectLogContext(request))
    await socialAuth.redirect()
  }

  /**
   * Xử lý callback từ nhà cung cấp xác thực
   */
  async callback(ctx: HttpContext) {
    const { params, ally, auth, response, request, session } = ctx
    const provider = buildSupportedSocialAuthProvider(params['provider'] as string)
    const execCtx = optionalActionContextFromHttp(ctx)
    const startedAt = Date.now()

    const host = request.header('host') ?? 'localhost:3333'
    const socialAuth = ally.use(provider) as unknown as SocialAuthRedirectDriver
    this.transportConfiguration.configureCallback(provider, host, socialAuth)

    platformOperationalLogger.log(
      'debug',
      buildAuthLoginEvent(execCtx, {
        eventName: PLATFORM_EVENT_NAMES.AUTH_LOGIN_STARTED,
        stage: 'started',
        outcome: 'success',
        provider,
        severity: 'debug',
      })
    )

    try {
      const callbackResult = await this.processCallback
        .executeAndWrap({
          context: execCtx,
          provider,
          socialAuth,
          webSession: {
            loginIdentity: (identity, remember) =>
              auth.use('web').login(identity as never, remember),
            setCurrentOrganizationId: (organizationId) =>
              session.put('current_organization_id', organizationId),
          },
        })
        .then((outcome) => outcome.getValue())
      if (callbackResult.type === 'error') {
        await platformWorkflowLogger.checkpointSafely(
          execCtx,
          buildAuthLoginEvent(execCtx, {
            eventName: PLATFORM_EVENT_NAMES.AUTH_LOGIN_FAILED,
            stage: 'callback_failed',
            outcome: 'failure',
            provider,
            runtime: {
              duration_ms: Date.now() - startedAt,
            },
            error: mapSocialAuthFailureEventError(callbackResult),
          })
        )
        const errorRedirect = mapSocialAuthErrorRedirect(callbackResult)
        response.redirect().withQs(errorRedirect.query).toPath(errorRedirect.path)
        return
      }

      await platformWorkflowLogger.checkpointSafely(
        {
          ...execCtx,
          userId: callbackResult.user.id,
          organizationId: callbackResult.currentOrganizationId,
        },
        buildAuthLoginEvent(execCtx, {
          eventName: PLATFORM_EVENT_NAMES.AUTH_LOGIN_COMPLETED,
          stage: 'completed',
          outcome: 'success',
          provider,
          userId: callbackResult.user.id,
          organizationId: callbackResult.currentOrganizationId,
          change: {
            redirect_to: callbackResult.redirectTo,
            is_new_user: callbackResult.redirectTo === '/organizations',
          },
          runtime: {
            duration_ms: Date.now() - startedAt,
          },
        })
      )

      response.redirect(mapSocialAuthSuccessRedirect(callbackResult.redirectTo).redirectTo)
    } catch (error) {
      await platformWorkflowLogger.checkpointSafely(
        execCtx,
        buildAuthLoginEvent(execCtx, {
          eventName: PLATFORM_EVENT_NAMES.AUTH_LOGIN_FAILED,
          stage: 'failed',
          outcome: 'failure',
          provider,
          runtime: {
            duration_ms: Date.now() - startedAt,
          },
          error,
        })
      )
      throw error
    }
  }
}
