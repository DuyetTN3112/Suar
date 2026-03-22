import type { HttpContext } from '@adonisjs/core/http'

/**
 * ListOrganizationsController
 *
 * Show list of all organizations
 *
 * GET /admin/organizations
 */
export default class ListOrganizationsController {
  async handle({ inertia, response, params, session }: HttpContext) {
    // TODO Phase 1.4: Implement action/query logic
    return inertia.render('admin/organizations/index', {})
  }
}
