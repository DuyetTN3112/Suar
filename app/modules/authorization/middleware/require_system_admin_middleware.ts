import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

import { canAccessSystemAdministration } from '#modules/authorization/public_contracts/system_admin_access'
import { ErrorCode, HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { emitApiError } from '#modules/http/boundary/http_api_error_emitter'
import {
  classifyHttpTransport,
  isApiTransport,
} from '#modules/http/boundary/http_transport'

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
  async handle(ctx: HttpContext, next: NextFn): Promise<void> {
    const { auth, session, response } = ctx
    const transport = classifyHttpTransport(ctx)

    // Check if user is authenticated
    if (!auth.user) {
      if (isApiTransport(transport)) {
        emitApiError(ctx, {
          transport,
          status: HttpStatus.UNAUTHORIZED,
          code: ErrorCode.UNAUTHORIZED,
          detail: 'You must be logged in to access this page',
          includeLegacyMeta: true,
        })
        return
      }
      session.flash('error', 'You must be logged in to access this page')
      response.redirect().toRoute('auth.login')
      return
    }

    const decision = await canAccessSystemAdministration(auth.user.system_role)
    if (!decision.allowed) {
      if (isApiTransport(transport)) {
        emitApiError(ctx, {
          transport,
          status: HttpStatus.FORBIDDEN,
          code: ErrorCode.FORBIDDEN,
          detail: 'Access denied. System administrator privileges required.',
          includeLegacyMeta: true,
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
