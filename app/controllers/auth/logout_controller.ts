import Logout from '#actions/auth/http/logout'
import type { HttpContext } from '@adonisjs/core/http'

export default class LogoutController {
  async handle({ request, response, inertia, session, auth }: HttpContext) {
    try {
      console.log('Xử lý đăng xuất...')
      // Log thông tin request
      console.log('Logout request info:', {
        method: request.method(),
        url: request.url(),
        headers: request.headers(),
        hasXInertia: !!request.header('X-Inertia'),
        csrfToken: request.input('_csrf'),
      })
      // Lưu thông tin người dùng trước khi đăng xuất để log
      const userId = auth.user?.id
      const userName = auth.user?.username
      console.log('Đang đăng xuất user:', { userId, userName })
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
      console.log(`Đã đăng xuất thành công user: ${userId}`)
      // Kiểm tra nếu request đến từ Inertia
      const isInertia = request.header('X-Inertia')
      if (isInertia) {
        // Chuyển hướng dùng Inertia
        return inertia.location('/login')
      }
      // Nếu không, sử dụng chuyển hướng thông thường
      return response.redirect().toPath('/login')
    } catch (error) {
      console.error('Lỗi trong LogoutController:', error)
      session.flash('error', 'Có lỗi xảy ra khi đăng xuất')
      return response.redirect().toPath('/login')
    }
  }
}
