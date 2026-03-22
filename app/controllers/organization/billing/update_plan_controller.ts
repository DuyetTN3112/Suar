import type { HttpContext } from '@adonisjs/core/http'

/**
 * UpdatePlanController
 *
 * Update subscription plan
 *
 * PUT /org/billing/plan
 */
export default class UpdatePlanController {
  async handle({ inertia, response, params, session }: HttpContext) {
    // TODO Phase 1.4: Implement action/query logic
    session.flash('success', 'Action completed')
    return response.redirect().back()
  }
}
