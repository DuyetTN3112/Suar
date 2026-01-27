import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

import { INTERFACE_CONTEXT_TYPES } from '#modules/authorization/constants/context_constants'

/**
 * SystemAdminContextMiddleware
 *
 * Marks an already-authorized request as belonging to the isolated System realm.
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
  async handle({ auth, view }: HttpContext, next: NextFn): Promise<void> {
    if (!auth.user) {
      await next()
      return
    }

    view.share({
      realm: 'system',
      contextType: INTERFACE_CONTEXT_TYPES.SYSTEM_ADMIN,
    })

    await next()
  }
}
