import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

import { canAccessSystemAdministration } from '#modules/authorization/public_contracts/system_admin_access'

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
  async handle({ auth, session, response, request }: HttpContext, next: NextFn): Promise<void> {
    // Check if user is authenticated
    if (!auth.user) {
      if (request.accepts(['html', 'json']) === 'json' || request.url().startsWith('/api/')) {
        response.status(401).json({
          status: 401,
          code: 'UNAUTHORIZED',
          message: 'You must be logged in to access this page'
        })
        return
      }
      session.flash('error', 'You must be logged in to access this page')
      response.redirect().toRoute('auth.login')
      return
    }

    const decision = canAccessSystemAdministration(auth.user.system_role)
    if (!decision.allowed) {
      if (request.accepts(['html', 'json']) === 'json' || request.url().startsWith('/api/')) {
        response.status(403).json({
          status: 403,
          code: 'FORBIDDEN',
          message: 'Access denied. System administrator privileges required.'
        })
        return
      }
      session.flash('error', 'Access denied. System administrator privileges required.')
      response.redirect().toPath('/')
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
