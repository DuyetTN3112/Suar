import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

import { canAccessAllowedSystemRoles } from '#domain/users/user_management_rules'

/**
 * AuthorizeRole Middleware — kiểm tra system role của user.
 *
 * v3: system_role là inline VARCHAR trên users table.
 * Không cần preload relationship, đọc trực tiếp auth.user.system_role.
 *
 * Accepts: string[] of role names (ví dụ: ['superadmin', 'system_admin'])
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

    const decision = canAccessAllowedSystemRoles(auth.user.system_role, allowedRoles)
    if (decision.allowed) {
      await next()
      return
    }

    // Không có quyền
    session.flash('error', 'Bạn không có quyền truy cập chức năng này')
    response.redirect().back()
  }
}
