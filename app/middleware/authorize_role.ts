import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class AuthorizeRoleMiddleware {
  async handle(
    { auth, response, session }: HttpContext,
    next: NextFn,
    allowedRoles: string[] = []
  ) {
    // Kiểm tra người dùng đã đăng nhập chưa
    if (!auth.user) {
      session.flash('error', 'Bạn cần đăng nhập để truy cập trang này')
      return response.redirect().toRoute('auth.login')
    }

    // Nếu không yêu cầu vai trò cụ thể, cho phép truy cập
    if (!allowedRoles.length) {
      return next()
    }

    // Kiểm tra vai trò của người dùng
    const userRoleId = auth.user.role_id

    // Kiểm tra vai trò Admin (thường có ID 1)
    const isAdmin = userRoleId === 1
    // Nếu người dùng là admin, luôn cho phép truy cập
    if (isAdmin) {
      return next()
    }
    // Phương thức này cần được thay đổi để phù hợp với logic của ứng dụng
    // Ví dụ: Nếu allowedRoles chứa roleId, hoặc tên vai trò
    // Ở đây giả sử allowedRoles chứa roleId dưới dạng chuỗi
    if (allowedRoles.includes(String(userRoleId))) {
      return next()
    }

    // Nếu không có quyền, chuyển hướng đến trang lỗi
    session.flash('error', 'Bạn không có quyền truy cập chức năng này')
    return response.redirect().back()
  }
}
