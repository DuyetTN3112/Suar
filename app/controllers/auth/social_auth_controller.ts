import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import UserDetail from '#models/user_detail'
import UserProfile from '#models/user_profile'
import UserSetting from '#models/user_setting'
import UserOAuthProvider from '#models/user_oauth_provider'
import db from '@adonisjs/lucid/services/db'

export default class SocialAuthController {
  /**
   * Chuyển hướng người dùng đến trang đăng nhập của nhà cung cấp
   */
  async redirect({ params, ally }: HttpContext) {
    const { provider } = params
    console.log(`[SOCIAL AUTH] Redirecting to ${provider}...`)
    // Kiểm tra provider hợp lệ
    if (!['google', 'github'].includes(provider)) {
      console.error(`[SOCIAL AUTH] Invalid provider: ${provider}`)
      return { error: 'Nhà cung cấp xác thực không được hỗ trợ' }
    }
    try {
      console.log(`[SOCIAL AUTH] Using ${provider} provider to redirect`)
      return ally.use(provider).redirect()
    } catch (error) {
      console.error(`[SOCIAL AUTH] Error redirecting to ${provider}:`, error)
      return { error: `Không thể chuyển hướng đến ${provider}` }
    }
  }
  /**
   * Xử lý callback từ nhà cung cấp xác thực
   */
  async callback({ params, ally, auth, response }: HttpContext) {
    const { provider } = params
    console.log(`[SOCIAL AUTH] Callback received from ${provider}`)
    // Kiểm tra provider hợp lệ
    if (!['google', 'github'].includes(provider)) {
      console.error(`[SOCIAL AUTH] Invalid provider: ${provider}`)
      return { error: 'Nhà cung cấp xác thực không được hỗ trợ' }
    }
    const socialAuth = ally.use(provider)
    // Xử lý các trường hợp lỗi
    if (socialAuth.accessDenied()) {
      console.error(`[SOCIAL AUTH] Access denied for ${provider}`)
      return response.redirect().withQs({ error: 'Truy cập bị từ chối' }).toPath('/login')
    }
    if (socialAuth.stateMisMatch()) {
      console.error(`[SOCIAL AUTH] State mismatch for ${provider}`)
      return response.redirect().withQs({ error: 'Phiên xác thực không hợp lệ' }).toPath('/login')
    }
    if (socialAuth.hasError()) {
      console.error(`[SOCIAL AUTH] Error from ${provider}:`, socialAuth.getError())
      return response.redirect().withQs({ error: socialAuth.getError() }).toPath('/login')
    }
    try {
      // Lấy thông tin người dùng từ nhà cung cấp xác thực
      console.log(`[SOCIAL AUTH] Getting user info from ${provider}`)
      const socialUser = await socialAuth.user()
      console.log(`[SOCIAL AUTH] User info received:`, {
        id: socialUser.id,
        name: socialUser.name,
        email: socialUser.email,
        nickName: socialUser.nickName,
        avatarUrl: socialUser.avatarUrl ? 'Available' : 'Not available',
      })
      // Kiểm tra xem đã có OAuth provider record chưa
      console.log(`[SOCIAL AUTH] Checking for existing OAuth provider record`)
      let oauthProvider
      try {
        oauthProvider = await UserOAuthProvider.query()
          .where('provider', provider)
          .where('provider_id', socialUser.id)
          .first()
        console.log(`[SOCIAL AUTH] OAuth provider record ${oauthProvider ? 'found' : 'not found'}`)
      } catch (error) {
        console.error(`[SOCIAL AUTH] Error checking OAuth provider:`, error)
        // Kiểm tra xem bảng đã tồn tại chưa
        if (error.code === 'ER_NO_SUCH_TABLE') {
          console.error(`[SOCIAL AUTH] Table user_oauth_providers does not exist`)
        }
        // Tiếp tục xử lý với oauthProvider là undefined
      }
      if (oauthProvider) {
        // Nếu đã có, lấy user tương ứng và đăng nhập
        console.log(
          `[SOCIAL AUTH] Found existing OAuth provider, getting user with ID ${oauthProvider.user_id}`
        )
        const user = await User.find(oauthProvider.user_id)
        if (user) {
          // Cập nhật token mới nếu cần
          console.log(`[SOCIAL AUTH] User found, updating tokens`)
          try {
            oauthProvider.access_token = socialUser.token.token
            oauthProvider.refresh_token = socialUser.token.refreshToken
            await oauthProvider.save()
            console.log(`[SOCIAL AUTH] Tokens updated successfully`)
          } catch (error) {
            console.error(`[SOCIAL AUTH] Error updating tokens:`, error)
          }
          console.log(`[SOCIAL AUTH] Logging in user ${user.id}`)
          await auth.use('web').login(user)
          console.log(`[SOCIAL AUTH] User logged in, redirecting to /tasks`)
          return response.redirect('/tasks')
        } else {
          console.error(`[SOCIAL AUTH] User with ID ${oauthProvider.user_id} not found`)
        }
      }
      // Tìm người dùng với email từ xã hội
      console.log(`[SOCIAL AUTH] Looking for user with email ${socialUser.email}`)
      let user = await User.findBy('email', socialUser.email)
      if (user) {
        console.log(`[SOCIAL AUTH] User found with ID ${user.id}, creating OAuth provider link`)
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
          console.log(`[SOCIAL AUTH] OAuth provider link created successfully`)
        } catch (error) {
          console.error(`[SOCIAL AUTH] Error creating OAuth provider link:`, error)
          // Nếu lỗi là do bảng không tồn tại
          if (error.code === 'ER_NO_SUCH_TABLE') {
            console.error(`[SOCIAL AUTH] Table user_oauth_providers does not exist`)
          }
        }
        // Cập nhật auth_method nếu đang là email
        try {
          if (user.auth_method === 'email' || !user.auth_method) {
            console.log(`[SOCIAL AUTH] Updating auth_method to ${provider}`)
            user.auth_method = provider as 'google' | 'github'
            await user.save()
            console.log(`[SOCIAL AUTH] auth_method updated successfully`)
          }
        } catch (error) {
          console.error(`[SOCIAL AUTH] Error updating auth_method:`, error)
          // Kiểm tra xem cột auth_method đã tồn tại chưa
          if (error.code === 'ER_BAD_FIELD_ERROR') {
            console.error(`[SOCIAL AUTH] Column auth_method does not exist in users table`)
          }
        }
        // Đăng nhập người dùng hiện có
        console.log(`[SOCIAL AUTH] Logging in existing user ${user.id}`)
        await auth.use('web').login(user)
        console.log(`[SOCIAL AUTH] User logged in, redirecting to /tasks`)
        return response.redirect('/tasks') // Chuyển hướng đến trang chính sau khi đăng nhập
      }
      // Nếu chưa có user, tạo mới
      console.log(`[SOCIAL AUTH] No user found with email ${socialUser.email}, creating new user`)
      try {
        await db.transaction(async (trx) => {
          console.log(`[SOCIAL AUTH] Starting transaction to create new user`)
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
          console.log(
            `[SOCIAL AUTH] Default status ID: ${defaultStatusId?.id}, default role ID: ${defaultRoleId?.id}`
          )

          if (!defaultStatusId || !defaultRoleId) {
            throw new Error('Default status or role not found')
          }
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
          console.log(
            `[SOCIAL AUTH] Creating user with username ${username}, email ${socialUser.email}`
          )

          // Tạo user mới
          try {
            interface UserData {
              email: any
              first_name: string
              last_name: string
              username: any
              password: string
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
              // Tạo mật khẩu ngẫu nhiên vì đăng nhập xã hội không cần mật khẩu
              password: Math.random().toString(36).substring(2, 15),
              status_id: defaultStatusId.id,
              role_id: defaultRoleId.id,
              current_organization_id: null,
            }
            // Thêm auth_method nếu cột tồn tại
            try {
              userData.auth_method = provider
            } catch (error) {
              console.error(`[SOCIAL AUTH] Error setting auth_method:`, error)
            }
            user = await User.create(userData, { client: trx })
            console.log(`[SOCIAL AUTH] User created with ID ${user.id}`)
          } catch (error) {
            console.error(`[SOCIAL AUTH] Error creating user:`, error)
            throw error
          }
          // Tạo OAuth provider record nếu bảng tồn tại
          try {
            console.log(`[SOCIAL AUTH] Creating OAuth provider record`)
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
            console.log(`[SOCIAL AUTH] OAuth provider record created successfully`)
          } catch (error) {
            console.error(`[SOCIAL AUTH] Error creating OAuth provider record:`, error)
            // Nếu lỗi là do bảng không tồn tại, bỏ qua
            if (error.code !== 'ER_NO_SUCH_TABLE') {
              throw error
            }
          }
          // Tạo profile và thông tin chi tiết
          console.log(
            `[SOCIAL AUTH] Creating user detail with avatar URL: ${socialUser.avatarUrl || 'None'}`
          )
          await UserDetail.create(
            {
              user_id: user.id,
              avatar_url: socialUser.avatarUrl,
            },
            { client: trx }
          )
          console.log(`[SOCIAL AUTH] Creating user profile`)
          await UserProfile.create(
            {
              user_id: user.id,
              language: 'vi',
            },
            { client: trx }
          )
          console.log(`[SOCIAL AUTH] Creating user settings`)
          await UserSetting.create(
            {
              user_id: user.id,
              theme: 'light',
              notifications_enabled: true,
              display_mode: 'grid',
            },
            { client: trx }
          )
          console.log(`[SOCIAL AUTH] Transaction completed successfully`)
        })
        // Đăng nhập người dùng mới
        console.log(`[SOCIAL AUTH] Logging in new user ${user!.id}`)
        await auth.use('web').login(user!)
        console.log(`[SOCIAL AUTH] New user logged in, redirecting to /organizations`)
        return response.redirect('/organizations') // Chuyển hướng để tạo tổ chức mới
      } catch (error) {
        console.error('[SOCIAL AUTH] Error creating user:', error)
        return response.redirect().withQs({ error: 'Lỗi khi tạo tài khoản mới' }).toPath('/login')
      }
    } catch (error) {
      console.error(`[SOCIAL AUTH] Error processing ${provider} callback:`, error)
      return response
        .redirect()
        .withQs({ error: 'Đã xảy ra lỗi trong quá trình xác thực' })
        .toPath('/login')
    }
  }
}
