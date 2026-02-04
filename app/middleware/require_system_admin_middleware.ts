import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

import { canAccessSystemAdministration } from '#modules/users/domain/user_management_rules'

/**
 * RequireSystemAdminMiddleware
 *
 * Protects routes that require SYSTEM-level admin access.
 * Only users with system_role = 'superadmin' or 'system_admin' can proceed.
 *
 * ⚠️ IMPORTANT:
 * - This is for SYSTEM admins (manage entire platform)
 * - NOT for organization admins (manage their org only)
 * - System admin ≠ Organization owner/admin
 *
 * Usage:
 * ```typescript
 * router.group(() => {
 *   // System admin routes
 * }).use([middleware.auth(), middleware.requireSystemAdmin()])
 * ```
 */
export default class RequireSystemAdminMiddleware {
  /**
   * Handle the request
   */
  async handle({ auth, session, response }: HttpContext, next: NextFn): Promise<void> {
    // Check if user is authenticated
    if (!auth.user) {
      session.flash('error', 'You must be logged in to access this page')
      response.redirect().toRoute('auth.login')
      return
    }

    const decision = canAccessSystemAdministration(auth.user.system_role)
    if (!decision.allowed) {
      session.flash('error', 'Access denied. System administrator privileges required.')
      response.redirect().toRoute('home')
      return
    }

    // TODO: Log system admin access to audit log
    // await AuditLog.create({
    //   user_id: auth.user.id,
    //   action: 'system_admin_access',
    //   resource_type: 'system',
    //   resource_id: null,
    //   ip_address: request.ip(),
    //   user_agent: request.header('user-agent'),
    // })

    await next()
  }
}
