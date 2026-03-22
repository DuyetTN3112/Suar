import type { HttpContext } from '@adonisjs/core/http'

/**
 * SuspendUserController
 *
 * Suspend/activate user
 *
 * PUT /admin/users/:id/suspend
 */
export default class SuspendUserController {
  async handle({ inertia, response, params, session }: HttpContext) {
    // TODO Phase 1.4: Implement action/query logic
    session.flash('success', 'Action completed')
    return response.redirect().back()
  }
}
