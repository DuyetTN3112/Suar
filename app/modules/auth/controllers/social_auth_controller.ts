import type { HttpContext } from '@adonisjs/core/http'
import config from '@adonisjs/core/services/config'

import {
  buildSocialAuthCallbackLogContext,
  buildSocialAuthRedirectLogContext,
  buildSupportedSocialAuthProvider,
} from './mappers/request/social_auth_request_mapper.js'
import {
  mapSocialAuthErrorRedirect,
  mapSocialAuthSessionState,
  mapSocialAuthSuccessRedirect,
} from './mappers/response/social_auth_response_mapper.js'

import ProcessSocialAuthCallbackCommand from '#modules/auth/actions/commands/process_social_auth_callback_command'
import {
  logSocialAuthCallbackStart,
  logSocialAuthConfigCheck,
  logSocialAuthRedirect,
} from '#modules/auth/actions/support/social_auth_logging'
import type { SocialAuthDriver } from '#modules/auth/infra/oauth/social_auth_provider_service'
import { buildAuthLoginEvent } from '#modules/auth/observability/auth_event_factory'
import { optionalActionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import { PLATFORM_EVENT_NAMES } from '#modules/observability/contracts/platform_event_names'
import {
  platformOperationalLogger,
  platformWorkflowLogger,
} from '#modules/observability/public_contracts/platform_observability'
import env from '#start/env'

interface AllyDriverWithConfig {
  config?: { callbackUrl?: string }
  options?: { callbackUrl?: string }
}

interface SocialAuthRedirectDriver extends SocialAuthDriver {
  redirect(): Promise<void>
}

export default class SocialAuthController {
  /**
   * Chuyển hướng người dùng đến trang đăng nhập của nhà cung cấp
   */
  async redirect({ params, ally, request, response, session }: HttpContext) {
    const provider = buildSupportedSocialAuthProvider(params['provider'] as string)

    const host = request.header('host') ?? 'localhost:3333'
    const appUrl = env.get('APP_URL')
    const appUrlObj = new URL(appUrl)
    const appHost = appUrlObj.host
    const appProtocol = appUrlObj.protocol

    const isLocalRequest = host.includes('localhost') || host.includes('127.0.0.1')
    const isLocalApp = appHost.includes('localhost') || appHost.includes('127.0.0.1')

    const requestPort = host.split(':')[1] ?? '80'
    const appPort = appHost.split(':')[1] ?? '80'

    // If the user accessed via 127.0.0.1:3333 but the app is configured for localhost:3333,
    // redirect them to localhost:3333 first so the session cookie matches the registered callback domain.
    if (isLocalRequest && isLocalApp && host !== appHost && requestPort === appPort) {
      response.redirect().toPath(`${appProtocol}//${appHost}/auth/${provider}/redirect`)
      return
    }

    // Ensure session cookie is established before cross-site OAuth redirect
    session.put('oauth_provider', provider)

    // Override callbackUrl dynamically based on current request host
    const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https'
    const dynamicCallbackUrl = `${protocol}://${host}/auth/${provider}/callback`
    config.set(`ally.${provider}.callbackUrl`, dynamicCallbackUrl)

    const hasClientId = !!env.get(`${provider.toUpperCase()}_CLIENT_ID`)
    const hasClientSecret = !!env.get(`${provider.toUpperCase()}_CLIENT_SECRET`)
    logSocialAuthConfigCheck(provider, hasClientId, hasClientSecret, dynamicCallbackUrl)

    logSocialAuthRedirect(provider, buildSocialAuthRedirectLogContext(request))
    const socialAuth = ally.use(provider) as unknown as SocialAuthRedirectDriver
    const driverWithConfig = socialAuth as unknown as AllyDriverWithConfig
    if (driverWithConfig.config) {
      driverWithConfig.config.callbackUrl = dynamicCallbackUrl
    }
    if (driverWithConfig.options) {
      driverWithConfig.options.callbackUrl = dynamicCallbackUrl
    }
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

    // Override callbackUrl dynamically based on current request host to match redirect config
    const host = request.header('host') ?? 'localhost:3333'
    const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https'
    const dynamicCallbackUrl = `${protocol}://${host}/auth/${provider}/callback`
    config.set(`ally.${provider}.callbackUrl`, dynamicCallbackUrl)

    const socialAuth = ally.use(provider) as unknown as SocialAuthRedirectDriver
    const driverWithConfig = socialAuth as unknown as AllyDriverWithConfig
    if (driverWithConfig.config) {
      driverWithConfig.config.callbackUrl = dynamicCallbackUrl
    }
    if (driverWithConfig.options) {
      driverWithConfig.options.callbackUrl = dynamicCallbackUrl
    }

    logSocialAuthCallbackStart(provider, buildSocialAuthCallbackLogContext(request))
    platformOperationalLogger.log(
      'info',
      buildAuthLoginEvent(execCtx, {
        eventName: PLATFORM_EVENT_NAMES.AUTH_LOGIN_STARTED,
        stage: 'started',
        outcome: 'success',
        provider,
      })
    )

    try {
      const callbackResult = await new ProcessSocialAuthCallbackCommand().execute(
        provider,
        socialAuth
      )
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
            error: {
              class: 'SocialAuthCallbackError',
              message: callbackResult.errorMessage,
            },
          })
        )
        const errorRedirect = mapSocialAuthErrorRedirect(callbackResult.errorMessage)
        response.redirect().withQs(errorRedirect.query).toPath(errorRedirect.path)
        return
      }

      await auth.use('web').login(callbackResult.user, true)
      const sessionState = mapSocialAuthSessionState(callbackResult.currentOrganizationId)
      if (sessionState) {
        session.put('current_organization_id', sessionState.currentOrganizationId)
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
