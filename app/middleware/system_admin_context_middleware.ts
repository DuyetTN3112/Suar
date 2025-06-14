import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { SystemRoleName } from '#constants/user_constants'

/**
 * SystemAdminContextMiddleware
 *
 * Sets context variables for system admin interface.
 * Detects if user is in "Admin Mode" and shares relevant data to views.
 *
 * Context variables shared:
 * - isAdminMode: boolean - Is user currently in admin mode?
 * - canSwitchToAdmin: boolean - Can user access admin mode?
 * - contextType: 'system_admin' | 'organization' | 'user' - Current interface context
 *
 * Usage:
 * ```typescript
 * router.group(() => {
 *   // System admin routes
 * }).use([middleware.auth(), middleware.requireSystemAdmin(), middleware.systemAdminContext()])
 * ```
 */
export default class SystemAdminContextMiddleware {
  /**
   * Handle the request
   */
  async handle({ auth, session, view }: HttpContext, next: NextFn): Promise<void> {
    // Check if user can access system admin
    const systemRole = auth.user?.system_role?.toLowerCase()
    const canSwitchToAdmin =
      systemRole === SystemRoleName.SUPERADMIN || systemRole === SystemRoleName.SYSTEM_ADMIN

    // Check if admin mode is enabled in session
    const isAdminMode = session.get('is_admin_mode', false) && canSwitchToAdmin

    // Share context to views
    view.share({
      isAdminMode,
      canSwitchToAdmin,
      contextType: isAdminMode ? 'system_admin' : 'user',
    })

    await next()
  }
}
