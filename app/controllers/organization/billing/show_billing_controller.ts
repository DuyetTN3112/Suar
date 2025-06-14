import type { HttpContext } from '@adonisjs/core/http'

/**
 * ShowBillingController
 *
 * Show billing info
 *
 * GET /org/billing
 */
export default class ShowBillingController {
  async handle({ inertia, response, params, session }: HttpContext) {
    // TODO Phase 1.4: Implement action/query logic
    return inertia.render('org/billing/index', {})
  }
}
