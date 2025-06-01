import type { HttpContext } from '@adonisjs/core/http'
import type { AllyUserContract } from '@adonisjs/ally/types'
import type { Oauth2AccessToken } from '@poppinss/oauth-client/types'
import User from '#models/user'
import UserOAuthProvider from '#models/user_oauth_provider'
import db from '@adonisjs/lucid/services/db'
import * as AuthLogger from '#libs/auth_logger'
import env from '#start/env'

type SupportedProvider = 'google' | 'github'
type SocialUser = AllyUserContract<Oauth2AccessToken>

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
      const socialUser: SocialUser = await socialAuth.user()
      AuthLogger.oauthUserReceived(provider, socialUser)

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

      const socialId = socialUser.id
      const accessToken = socialUser.token.token
      const refreshToken = socialUser.token.refreshToken ?? null

      // Kiểm tra xem đã có OAuth provider record chưa
      let oauthProvider
      try {
        oauthProvider = await UserOAuthProvider.query()
          .where('provider', provider)
          .where('provider_id', socialId)
          .first()
        AuthLogger.oauthProviderLookup(provider, socialId, !!oauthProvider)
      } catch (error: unknown) {
        AuthLogger.oauthError(provider, error, 'provider-lookup')
        // Kiểm tra xem bảng đã tồn tại chưa
        if (
          error &&
          typeof error === 'object' &&
          'code' in error &&
          error.code === 'ER_NO_SUCH_TABLE'
        ) {
          // Table doesn't exist, continue with oauthProvider as undefined
        }
        // Continue processing with oauthProvider as undefined
      }

      if (oauthProvider) {
        // Nếu đã có, lấy user tương ứng và đăng nhập
        const user = await User.find(oauthProvider.user_id)
        if (user) {
          // Cập nhật token mới nếu cần
          try {
            oauthProvider.access_token = accessToken
            oauthProvider.refresh_token = refreshToken
            await oauthProvider.save()
            AuthLogger.dbTransaction('update-oauth-tokens', true, { userId: user.id })
          } catch (error: unknown) {
            AuthLogger.oauthError(provider, error, 'update-tokens')
          }
          await auth.use('web').login(user)
          AuthLogger.userLogin(user.id, user.email, provider)
          response.redirect('/tasks')
          return
        }
      }
      // Tìm người dùng với email từ xã hội
      let user = await User.findBy('email', socialEmail)
      AuthLogger.dbTransaction('find-user-by-email', true, {
        email: socialEmail,
        found: !!user,
      })

      if (user) {
        // Nếu người dùng đã tồn tại nhưng chưa có liên kết với provider này
        try {
          await UserOAuthProvider.create({
            user_id: user.id,
            provider: provider,
            provider_id: socialId,
            email: socialEmail,
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          AuthLogger.dbTransaction('link-oauth-provider', true, { userId: user.id, provider })
        } catch (error: unknown) {
          AuthLogger.oauthError(provider, error, 'link-oauth-provider')
          // Nếu lỗi là do bảng không tồn tại
          if (
            error &&
            typeof error === 'object' &&
            'code' in error &&
            error.code === 'ER_NO_SUCH_TABLE'
          ) {
            // Table doesn't exist, continue
          }
        }
        // Cập nhật auth_method nếu đang là email
        try {
          if (user.auth_method === 'email') {
            user.auth_method = provider
            await user.save()
          }
        } catch (error: unknown) {
          // Kiểm tra xem cột auth_method đã tồn tại chưa
          if (
            error &&
            typeof error === 'object' &&
            'code' in error &&
            error.code === 'ER_BAD_FIELD_ERROR'
          ) {
            // Column doesn't exist, continue
          }
        }
        // Đăng nhập người dùng hiện có
        await auth.use('web').login(user)
        AuthLogger.userLogin(user.id, user.email, provider)
        response.redirect('/tasks')
        return // Chuyển hướng đến trang chính sau khi đăng nhập
      }
      // Nếu chưa có user, tạo mới
      AuthLogger.dbTransaction('create-new-user-start', true, { provider, email: socialEmail })
      try {
        await db.transaction(async (trx) => {
          // Tìm status_id và role_id mặc định
          const defaultStatusId = (await db
            .from('user_status')
            .where('name', 'active')
            .select('id')
            .first()) as { id: number } | null
          const defaultRoleId = (await db
            .from('system_roles')
            .where('name', 'registered_user')
            .select('id')
            .first()) as { id: number } | null

          if (!defaultStatusId || !defaultRoleId) {
            AuthLogger.oauthError(
              provider,
              new Error('Default status or role not found'),
              'create-user'
            )
            throw new Error('Default status or role not found')
          }

          AuthLogger.dbTransaction('found-defaults', true, {
            statusId: defaultStatusId.id,
            roleId: defaultRoleId.id,
          })
          // Xác định tên và họ từ dữ liệu mạng xã hội
          let firstName = ''
          let lastName = ''
          const socialName = socialUser.name
          const nameParts = socialName.split(' ')
          if (nameParts.length > 0) {
            lastName = nameParts.pop() ?? ''
            firstName = nameParts.join(' ')
          }
          if (!firstName && !lastName && socialName) {
            firstName = socialName
          }

          // Tạo username từ email nếu không có
          const nickName = socialUser.nickName
          const username = nickName || socialEmail.split('@')[0] || `user_${Date.now()}`
          // Tạo user mới
          try {
            interface UserData {
              email: string
              username: string
              status_id: number
              system_role_id: number
              current_organization_id: null
              auth_method?: 'google' | 'github' | 'email'
            }
            const userData: UserData = {
              email: socialEmail,
              username: username,
              status_id: defaultStatusId.id,
              system_role_id: defaultRoleId.id,
              current_organization_id: null,
            }
            // Thêm auth_method nếu cột tồn tại
            try {
              userData.auth_method = provider
            } catch {
              // Error setting auth_method
            }
            user = await User.create(userData, { client: trx })
            AuthLogger.userCreated(user.id, provider, user.email)
          } catch (error: unknown) {
            AuthLogger.oauthError(provider, error, 'create-user-record')
            throw error
          }

          // Tạo OAuth provider record nếu bảng tồn tại
          try {
            await UserOAuthProvider.create(
              {
                user_id: user.id,
                provider: provider,
                provider_id: socialId,
                email: socialEmail,
                access_token: accessToken,
                refresh_token: refreshToken,
              },
              { client: trx }
            )
            AuthLogger.dbTransaction('create-oauth-provider', true, { userId: user.id, provider })
          } catch (error: unknown) {
            AuthLogger.oauthError(provider, error, 'create-oauth-provider')
            // Nếu lỗi là do bảng không tồn tại, bỏ qua
            const dbError = error as { code?: string }
            if (dbError.code !== 'ER_NO_SUCH_TABLE') {
              throw error
            }
          }

          AuthLogger.dbTransaction('create-user-complete', true, { userId: user.id })
        })

        // Đăng nhập người dùng mới - user is guaranteed to be User type after transaction
        // TypeScript cannot track reassignment inside transaction callback
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (!user) {
          throw new Error('User creation failed')
        }
        const createdUser = user as User
        await auth.use('web').login(createdUser)
        AuthLogger.userLogin(createdUser.id, createdUser.email, provider)
        response.redirect('/organizations')
        return // Chuyển hướng để tạo tổ chức mới
      } catch (error: unknown) {
        AuthLogger.oauthError(provider, error, 'create-user-transaction')
        response.redirect().withQs({ error: 'Lỗi khi tạo tài khoản mới' }).toPath('/login')
        return
      }
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
