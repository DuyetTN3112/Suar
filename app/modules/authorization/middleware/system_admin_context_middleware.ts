import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

import { INTERFACE_CONTEXT_TYPES, type InterfaceContextType } from '#modules/authorization/constants/context_constants'

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
    if (!auth.user) {
      await next()
      return
    }

    // Check if user can access system admin
    const systemRole = auth.user.system_role.toLowerCase()
    const canSwitchToAdmin = systemRole === 'superadmin' || systemRole === 'system_admin'

    // Check if admin mode is enabled in session
    const isAdminModeRaw: unknown = session.get('is_admin_mode', false)
    const isAdminMode = Boolean(isAdminModeRaw) && canSwitchToAdmin

    // Share context to views
    const contextType: InterfaceContextType = isAdminMode
      ? INTERFACE_CONTEXT_TYPES.SYSTEM_ADMIN
      : INTERFACE_CONTEXT_TYPES.USER

    view.share({
      isAdminMode,
      canSwitchToAdmin,
      contextType,
    })

    await next()
  }
}
