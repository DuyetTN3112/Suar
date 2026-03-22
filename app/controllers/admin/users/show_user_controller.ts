import type { HttpContext } from '@adonisjs/core/http'

/**
 * ShowUserController
 *
 * Show user details
 *
 * GET /admin/users/:id
 */
export default class ShowUserController {
  async handle({ inertia, response, params, session }: HttpContext) {
    // TODO Phase 1.4: Implement action/query logic
    return inertia.render('admin/users/show', {})
  }
}
