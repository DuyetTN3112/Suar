import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
// import Organization from '#models/organization'

export default class AuthController {
  /**
   * Hiển thị form đăng nhập
   */
  async showLogin(ctx: HttpContext) {
    const { inertia, auth, session } = ctx
    // Nếu đã đăng nhập, chuyển hướng về trang chủ
    if (await auth.check()) {
      return inertia.location('/')
    }
    return inertia.render('auth/login', {
      show_organization_required_modal: session.get('show_organization_required_modal', false),
    })
  }

  /**
   * Xử lý đăng nhập
   */
  async login({ request, auth, response, session }: HttpContext) {
    const {
      email,
      password, // remember
    } = request.only(['email', 'password', 'remember'])
    try {
      // Tìm user
      const user = await User.findBy('email', email)
      if (!user) {
        // Người dùng không tồn tại
        session.flash('error', 'Thông tin đăng nhập không chính xác')
        return response.redirect().back()
      }
      // Kiểm tra mật khẩu
      if (user.password !== password) {
        // Mật khẩu không đúng
        session.flash('error', 'Thông tin đăng nhập không chính xác')
        return response.redirect().back()
      }
      // Đăng nhập
      await auth.use('web').login(user)
      // Chuyển hướng
      const intendedUrl = session.get('intended_url', '/')
      session.forget('intended_url')
      return response.redirect().toPath(intendedUrl)
    } catch (error) {
      session.flash('error', 'Có lỗi xảy ra khi đăng nhập')
      return response.redirect().back()
    }
  }

  /**
   * Xử lý đăng xuất
   */
  async logout({ auth, response }: HttpContext) {
    await auth.use('web').logout()
    return response.redirect().toPath('/login')
  }

  /**
   * Lấy thông tin người dùng hiện tại
   */
  async currentUser({ auth, response }: HttpContext) {
    try {
      // Kiểm tra xác thực
      if (!(await auth.check())) {
        return response.status(401).json({
          success: false,
          message: 'Chưa đăng nhập',
        })
      }

      // Lấy thông tin người dùng
      const user = auth.user!
      await user.load('organizations')

      // Trả về thông tin người dùng
      return {
        success: true,
        user: {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          full_name: user.full_name,
          email: user.email,
          username: user.username,
          organizations: user.organizations,
        },
      }
    } catch (error) {
      return response.status(500).json({
        success: false,
        message: 'Lỗi khi lấy thông tin người dùng',
      })
    }
  }

  /**
   * Giả lập API đăng nhập cho phát triển
   */
  async devLogin({ request, auth, response }: HttpContext) {
    // Chỉ hoạt động ở môi trường phát triển
    if (process.env.NODE_ENV !== 'development') {
      return response.status(403).json({
        success: false,
        message: 'API này chỉ khả dụng trong môi trường phát triển',
      })
    }

    const { userId, email } = request.only(['userId', 'email'])
    try {
      let user: User | null = null
      // Tìm user theo ID hoặc email
      if (userId) {
        user = await User.find(userId)
      } else if (email) {
        user = await User.findBy('email', email)
      }
      if (!user) {
        return response.status(404).json({
          success: false,
          message: 'Không tìm thấy người dùng',
        })
      }
      // Đăng nhập bằng user đã tìm được
      const guard = auth.use('web')
      await guard.login(user)
      return response.json({
        success: true,
        message: 'Đăng nhập thành công',
        user: {
          id: user.id,
          name: user.full_name || `${user.first_name} ${user.last_name}`,
          email: user.email,
        },
      })
    } catch (error) {
      return response.status(500).json({
        success: false,
        message: `Lỗi: ${error.message}`,
      })
    }
  }
}
