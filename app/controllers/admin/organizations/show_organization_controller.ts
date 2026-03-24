import type { HttpContext } from '@adonisjs/core/http'

/**
 * ShowOrganizationController
 *
 * Show organization details
 *
 * GET /admin/organizations/:id
 */
export default class ShowOrganizationController {
  async handle({ inertia }: HttpContext) {
    // TODO Phase 1.4: Implement action/query logic
    return inertia.render('admin/organizations/show', {})
  }
}
