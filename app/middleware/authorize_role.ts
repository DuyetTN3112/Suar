import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * AuthorizeRole Middleware — kiểm tra system role của user.
 *
 * FIX: Dùng role NAME thay vì hardcoded role IDs.
 * Accepts: string[] of role names (ví dụ: ['superadmin', 'system_admin'])
 *
 * Nếu user đã load system_role (từ auth_middleware), so sánh trực tiếp.
 * Nếu chưa load, fallback sang role_id comparison.
 */
export default class AuthorizeRoleMiddleware {
  async handle(
    { auth, response, session }: HttpContext,
    next: NextFn,
    allowedRoles: string[] = []
  ): Promise<void> {
    // Kiểm tra user đã đăng nhập
    if (!auth.user) {
      session.flash('error', 'Bạn cần đăng nhập để truy cập trang này')
      response.redirect().toRoute('auth.login')
      return
    }

    // Nếu không yêu cầu role cụ thể → cho phép
    if (allowedRoles.length === 0) {
      await next()
      return
    }

    // Superadmin luôn được phép
    const systemRoleName = auth.user.$preloaded.system_role
      ? auth.user.system_role.name.toLowerCase()
      : ''

    if (systemRoleName === 'superadmin') {
      await next()
      return
    }

    // FIX BẢO MẬT: Chỉ compare role name, bỏ fallback role ID
    // Fallback dùng String(system_role_id) dễ confuse và sẽ break khi ID là UUID
    // Yêu cầu: system_role phải được preloaded bởi auth_middleware
    const isAllowed = allowedRoles.some((role) => {
      return systemRoleName === role.toLowerCase()
    })

    if (isAllowed) {
      await next()
      return
    }

    // Không có quyền
    session.flash('error', 'Bạn không có quyền truy cập chức năng này')
    response.redirect().back()
  }
}
