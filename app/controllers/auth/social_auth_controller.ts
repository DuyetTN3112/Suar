import type { HttpContext } from '@adonisjs/core/http'

import * as AuthLogger from '#libs/auth_logger'
import env from '#start/env'
import SocialLoginCommand from '#actions/auth/commands/social_login_command'

type SupportedProvider = 'google' | 'github'

export default class SocialAuthController {
  /**
   * Check if provider is supported
   */
  private isSupportedProvider(provider: string): provider is SupportedProvider {
    return ['google', 'github'].includes(provider)
  }

  /**
   * Chuyển hướng người dùng đến trang đăng nhập của nhà cung cấp
   */
  async redirect({ params, ally, request }: HttpContext) {
    const provider = params.provider as string

    // Log config check
    const hasClientId = !!env.get(`${provider.toUpperCase()}_CLIENT_ID`)
    const hasClientSecret = !!env.get(`${provider.toUpperCase()}_CLIENT_SECRET`)
    const callbackUrl = `http://localhost:3333/auth/${provider}/callback`
    AuthLogger.configCheck(provider, hasClientId, hasClientSecret, callbackUrl)

    // Kiểm tra provider hợp lệ
    if (!this.isSupportedProvider(provider)) {
      AuthLogger.oauthError(provider, new Error('Provider not supported'), 'redirect')
      return { error: 'Nhà cung cấp xác thực không được hỗ trợ' }
    }

    try {
      AuthLogger.oauthRedirect(provider, {
        referer: request.header('referer'),
        userAgent: request.header('user-agent'),
        ip: request.ip(),
      })
      const socialAuth = ally.use(provider)
      await socialAuth.redirect()
      return
    } catch (error: unknown) {
      AuthLogger.oauthError(provider, error, 'redirect')
      return { error: `Không thể chuyển hướng đến ${provider}` }
    }
  }

  /**
   * Xử lý callback từ nhà cung cấp xác thực
   */
  async callback({ params, ally, auth, response, request }: HttpContext) {
    const provider = params.provider as string

    AuthLogger.oauthCallbackStart(provider, {
      query: request.qs(),
      referer: request.header('referer'),
      ip: request.ip(),
    })

    // Kiểm tra provider hợp lệ
    if (!this.isSupportedProvider(provider)) {
      AuthLogger.oauthError(provider, new Error('Provider not supported'), 'callback-validation')
      return { error: 'Nhà cung cấp xác thực không được hỗ trợ' }
    }

    const socialAuth = ally.use(provider)

    // Xử lý các trường hợp lỗi
    if (socialAuth.accessDenied()) {
      AuthLogger.oauthStateError(provider, 'access_denied')
      response.redirect().withQs({ error: 'Truy cập bị từ chối' }).toPath('/login')
      return
    }
    if (socialAuth.stateMisMatch()) {
      AuthLogger.oauthStateError(provider, 'state_mismatch')
      response.redirect().withQs({ error: 'Phiên xác thực không hợp lệ' }).toPath('/login')
      return
    }
    if (socialAuth.hasError()) {
      const errorMessage = socialAuth.getError()
      AuthLogger.oauthError(provider, errorMessage, 'callback-error')
      response.redirect().withQs({ error: errorMessage }).toPath('/login')
      return
    }

    try {
      // Lấy thông tin người dùng từ nhà cung cấp xác thực
      const socialUser = await socialAuth.user()
      AuthLogger.oauthUserReceived(provider, socialUser as any)

      // Validate email exists
      const socialEmail = socialUser.email
      if (!socialEmail) {
        AuthLogger.oauthError(provider, new Error('No email from provider'), 'no-email')
        response
          .redirect()
          .withQs({ error: 'Email không được cung cấp từ nhà cung cấp' })
          .toPath('/login')
        return
      }

      // Delegate all business logic to SocialLoginCommand
      const command = new SocialLoginCommand()
      const result = await command.execute(provider, {
        id: socialUser.id,
        email: socialEmail,
        name: socialUser.name,
        nickName: socialUser.nickName,
        token: socialUser.token.token,
        refreshToken: (socialUser.token as any).refreshToken ?? null,
      })

      // Login user
      await auth.use('web').login(result.user)
      response.redirect(result.redirectTo)
      return
    } catch (error: unknown) {
      AuthLogger.oauthError(provider, error, 'callback-outer')
      response
        .redirect()
        .withQs({ error: 'Đã xảy ra lỗi trong quá trình xác thực' })
        .toPath('/login')
      return
    }
  }
}
