import type { HttpContext } from '@adonisjs/core/http'

/**
 * OrgDashboardController
 *
 * Show organization dashboard
 *
 * GET /org
 */
export default class OrgDashboardController {
  async handle({ inertia, response, params, session }: HttpContext) {
    // TODO Phase 1.4: Implement action/query logic
    return inertia.render('org/dashboard', {})
  }
}
