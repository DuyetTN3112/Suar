import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import UserDetail from '#models/user_detail'
import UserProfile from '#models/user_profile'
import UserSetting from '#models/user_setting'
import UserOAuthProvider from '#models/user_oauth_provider'
import db from '@adonisjs/lucid/services/db'
import { AuthLogger } from '../../helpers/auth_logger.js'
import env from '#start/env'

export default class SocialAuthController {
  /**
   * Chuyển hướng người dùng đến trang đăng nhập của nhà cung cấp
   */
  async redirect({ params, ally, request }: HttpContext) {
    const { provider } = params

    // Log config check
    const hasClientId = !!env.get(`${provider.toUpperCase()}_CLIENT_ID`)
    const hasClientSecret = !!env.get(`${provider.toUpperCase()}_CLIENT_SECRET`)
    const callbackUrl = `http://localhost:3333/auth/${provider}/callback`
    AuthLogger.configCheck(provider, hasClientId, hasClientSecret, callbackUrl)

    // Kiểm tra provider hợp lệ
    if (!['google', 'github'].includes(provider)) {
      AuthLogger.oauthError(provider, new Error('Provider not supported'), 'redirect')
      return { error: 'Nhà cung cấp xác thực không được hỗ trợ' }
    }

    try {
      AuthLogger.oauthRedirect(provider, {
        referer: request.header('referer'),
        userAgent: request.header('user-agent'),
        ip: request.ip(),
      })
      return ally.use(provider).redirect()
    } catch (error) {
      AuthLogger.oauthError(provider, error, 'redirect')
      return { error: `Không thể chuyển hướng đến ${provider}` }
    }
  }
  /**
   * Xử lý callback từ nhà cung cấp xác thực
   */
  async callback({ params, ally, auth, response, request }: HttpContext) {
    const { provider } = params

    AuthLogger.oauthCallbackStart(provider, {
      query: request.qs(),
      referer: request.header('referer'),
      ip: request.ip(),
    })

    // Kiểm tra provider hợp lệ
    if (!['google', 'github'].includes(provider)) {
      AuthLogger.oauthError(provider, new Error('Provider not supported'), 'callback-validation')
      return { error: 'Nhà cung cấp xác thực không được hỗ trợ' }
    }

    const socialAuth = ally.use(provider)

    // Xử lý các trường hợp lỗi
    if (socialAuth.accessDenied()) {
      AuthLogger.oauthStateError(provider, 'access_denied')
      return response.redirect().withQs({ error: 'Truy cập bị từ chối' }).toPath('/login')
    }
    if (socialAuth.stateMisMatch()) {
      AuthLogger.oauthStateError(provider, 'state_mismatch')
      return response.redirect().withQs({ error: 'Phiên xác thực không hợp lệ' }).toPath('/login')
    }
    if (socialAuth.hasError()) {
      AuthLogger.oauthError(provider, socialAuth.getError(), 'callback-error')
      return response.redirect().withQs({ error: socialAuth.getError() }).toPath('/login')
    }

    try {
      // Lấy thông tin người dùng từ nhà cung cấp xác thực
      const socialUser = await socialAuth.user()
      AuthLogger.oauthUserReceived(provider, socialUser)
      // Kiểm tra xem đã có OAuth provider record chưa
      let oauthProvider
      try {
        oauthProvider = await UserOAuthProvider.query()
          .where('provider', provider)
          .where('provider_id', socialUser.id)
          .first()
        AuthLogger.oauthProviderLookup(provider, socialUser.id, !!oauthProvider)
      } catch (error) {
        AuthLogger.oauthError(provider, error, 'provider-lookup')
        // Kiểm tra xem bảng đã tồn tại chưa
        if (error.code === 'ER_NO_SUCH_TABLE') {
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
            oauthProvider.access_token = socialUser.token.token
            oauthProvider.refresh_token = socialUser.token.refreshToken
            await oauthProvider.save()
            AuthLogger.dbTransaction('update-oauth-tokens', true, { userId: user.id })
          } catch (error) {
            AuthLogger.oauthError(provider, error, 'update-tokens')
          }
          await auth.use('web').login(user)
          AuthLogger.userLogin(user.id, user.email, provider)
          return response.redirect('/tasks')
        }
      }
      // Tìm người dùng với email từ xã hội
      let user = await User.findBy('email', socialUser.email)
      AuthLogger.dbTransaction('find-user-by-email', true, {
        email: socialUser.email,
        found: !!user,
      })

      if (user) {
        // Nếu người dùng đã tồn tại nhưng chưa có liên kết với provider này
        try {
          await UserOAuthProvider.create({
            user_id: user.id,
            provider: provider,
            provider_id: socialUser.id,
            email: socialUser.email,
            access_token: socialUser.token.token,
            refresh_token: socialUser.token.refreshToken,
          })
          AuthLogger.dbTransaction('link-oauth-provider', true, { userId: user.id, provider })
        } catch (error) {
          AuthLogger.oauthError(provider, error, 'link-oauth-provider')
          // Nếu lỗi là do bảng không tồn tại
          if (error.code === 'ER_NO_SUCH_TABLE') {
            // Table doesn't exist, continue
          }
        }
        // Cập nhật auth_method nếu đang là email
        try {
          if (user.auth_method === 'email' || !user.auth_method) {
            user.auth_method = provider as 'google' | 'github'
            await user.save()
          }
        } catch (error) {
          // Kiểm tra xem cột auth_method đã tồn tại chưa
          if (error.code === 'ER_BAD_FIELD_ERROR') {
            // Column doesn't exist, continue
          }
        }
        // Đăng nhập người dùng hiện có
        await auth.use('web').login(user)
        AuthLogger.userLogin(user.id, user.email, provider)
        return response.redirect('/tasks') // Chuyển hướng đến trang chính sau khi đăng nhập
      }
      // Nếu chưa có user, tạo mới
      AuthLogger.dbTransaction('create-new-user-start', true, { provider, email: socialUser.email })
      try {
        await db.transaction(async (trx) => {
          // Tìm status_id và role_id mặc định
          const defaultStatusId = await db
            .from('user_status')
            .where('name', 'active')
            .select('id')
            .first()
          const defaultRoleId = await db
            .from('user_roles')
            .where('name', 'user')
            .select('id')
            .first()

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
          const nameParts = socialUser.name?.split(' ') || []
          if (nameParts.length > 0) {
            lastName = nameParts.pop() || ''
            firstName = nameParts.join(' ')
          }
          if (!firstName && !lastName && socialUser.name) {
            firstName = socialUser.name
          }

          // Tạo username từ email nếu không có
          const username =
            socialUser.nickName || socialUser.email?.split('@')[0] || `user_${Date.now()}`
          // Tạo user mới
          try {
            interface UserData {
              email: any
              first_name: string
              last_name: string
              username: any
              status_id: any
              role_id: any
              current_organization_id: null
              auth_method?: 'google' | 'github' | 'email'
            }
            const userData: UserData = {
              email: socialUser.email,
              first_name: firstName,
              last_name: lastName,
              username: username,
              status_id: defaultStatusId.id,
              role_id: defaultRoleId.id,
              current_organization_id: null,
            }
            // Thêm auth_method nếu cột tồn tại
            try {
              userData.auth_method = provider
            } catch (error) {
              // Error setting auth_method
            }
            user = await User.create(userData, { client: trx })
            AuthLogger.userCreated(user.id, provider, user.email)
          } catch (error) {
            AuthLogger.oauthError(provider, error, 'create-user-record')
            throw error
          }

          // Tạo OAuth provider record nếu bảng tồn tại
          try {
            await UserOAuthProvider.create(
              {
                user_id: user.id,
                provider: provider,
                provider_id: socialUser.id,
                email: socialUser.email,
                access_token: socialUser.token.token,
                refresh_token: socialUser.token.refreshToken,
              },
              { client: trx }
            )
            AuthLogger.dbTransaction('create-oauth-provider', true, { userId: user.id, provider })
          } catch (error) {
            AuthLogger.oauthError(provider, error, 'create-oauth-provider')
            // Nếu lỗi là do bảng không tồn tại, bỏ qua
            if (error.code !== 'ER_NO_SUCH_TABLE') {
              throw error
            }
          }
          // Tạo profile và thông tin chi tiết
          await UserDetail.create(
            {
              user_id: user.id,
              avatar_url: socialUser.avatarUrl,
            },
            { client: trx }
          )
          await UserProfile.create(
            {
              user_id: user.id,
              language: 'vi',
            },
            { client: trx }
          )
          await UserSetting.create(
            {
              user_id: user.id,
              theme: 'light',
              notifications_enabled: true,
              display_mode: 'grid',
            },
            { client: trx }
          )
          AuthLogger.dbTransaction('create-user-complete', true, { userId: user.id })
        })

        // Đăng nhập người dùng mới
        await auth.use('web').login(user!)
        AuthLogger.userLogin(user!.id, user!.email, provider)
        return response.redirect('/organizations') // Chuyển hướng để tạo tổ chức mới
      } catch (error) {
        AuthLogger.oauthError(provider, error, 'create-user-transaction')
        return response.redirect().withQs({ error: 'Lỗi khi tạo tài khoản mới' }).toPath('/login')
      }
    } catch (error) {
      AuthLogger.oauthError(provider, error, 'callback-outer')
      return response
        .redirect()
        .withQs({ error: 'Đã xảy ra lỗi trong quá trình xác thực' })
        .toPath('/login')
    }
  }
}
