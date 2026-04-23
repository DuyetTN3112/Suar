import type { HttpContext } from '@adonisjs/core/http'

import {
  logSocialAuthCallbackStart,
  logSocialAuthConfigCheck,
  logSocialAuthRedirect,
} from '#actions/auth/support/social_auth_logging'
import {
  buildSocialAuthCallbackLogContext,
  buildSocialAuthCallbackUrl,
  buildSocialAuthRedirectLogContext,
  buildSupportedSocialAuthProvider,
} from './mappers/request/social_auth_request_mapper.js'
import {
  mapSocialAuthErrorRedirect,
  mapSocialAuthSessionState,
  mapSocialAuthSuccessRedirect,
} from './mappers/response/social_auth_response_mapper.js'

import ProcessSocialAuthCallbackCommand from '#actions/auth/commands/process_social_auth_callback_command'
import env from '#start/env'

export default class SocialAuthController {
  /**
   * Chuyển hướng người dùng đến trang đăng nhập của nhà cung cấp
   */
  async redirect({ params, ally, request }: HttpContext) {
    const provider = buildSupportedSocialAuthProvider(params.provider as string)

    const hasClientId = !!env.get(`${provider.toUpperCase()}_CLIENT_ID`)
    const hasClientSecret = !!env.get(`${provider.toUpperCase()}_CLIENT_SECRET`)
    const callbackUrl = buildSocialAuthCallbackUrl(provider)
    logSocialAuthConfigCheck(provider, hasClientId, hasClientSecret, callbackUrl)

    logSocialAuthRedirect(provider, buildSocialAuthRedirectLogContext(request))
    const socialAuth = ally.use(provider)
    await socialAuth.redirect()
  }

  /**
   * Xử lý callback từ nhà cung cấp xác thực
   */
  async callback({ params, ally, auth, response, request, session }: HttpContext) {
    const provider = buildSupportedSocialAuthProvider(params.provider as string)

    logSocialAuthCallbackStart(provider, buildSocialAuthCallbackLogContext(request))

    const callbackResult = await new ProcessSocialAuthCallbackCommand().execute(
      provider,
      ally.use(provider)
    )
    if (callbackResult.type === 'error') {
      const errorRedirect = mapSocialAuthErrorRedirect(callbackResult.errorMessage)
      response.redirect().withQs(errorRedirect.query).toPath(errorRedirect.path)
      return
    }

    await auth.use('web').login(callbackResult.user)
    const sessionState = mapSocialAuthSessionState(callbackResult.currentOrganizationId)
    if (sessionState) {
      session.put('current_organization_id', sessionState.currentOrganizationId)
    }

    response.redirect(mapSocialAuthSuccessRedirect(callbackResult.redirectTo).redirectTo)
  }
}
