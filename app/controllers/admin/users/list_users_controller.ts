import type { HttpContext } from '@adonisjs/core/http'

/**
 * ListUsersController
 *
 * Show list of all users
 *
 * GET /admin/users
 */
export default class ListUsersController {
  async handle({ inertia, response, params, session }: HttpContext) {
    // TODO Phase 1.4: Implement action/query logic
    return inertia.render('admin/users/index', {})
  }
}
