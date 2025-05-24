import Logout from '#actions/auth/http/logout'
import type { HttpContext } from '@adonisjs/core/http'

export default class LogoutController {
  async handle({ request, response, inertia, session, auth }: HttpContext) {
    try {
      // Đăng xuất
      if (auth.isAuthenticated) {
        await auth.use('web').logout()
        // Xóa các biến session liên quan
        session.forget('auth')
        session.forget('show_organization_required_modal')
        session.forget('intended_url')
        // Đặt message thành công
        session.flash('success', 'Đã đăng xuất thành công')
      }
      // Kiểm tra nếu request đến từ Inertia
      const isInertia = request.header('X-Inertia')
      if (isInertia) {
        // Chuyển hướng dùng Inertia
        return inertia.location('/login')
      }
      // Nếu không, sử dụng chuyển hướng thông thường
      return response.redirect().toPath('/login')
    } catch (error) {
      session.flash('error', 'Có lỗi xảy ra khi đăng xuất')
      return response.redirect().toPath('/login')
    }
  }
}
