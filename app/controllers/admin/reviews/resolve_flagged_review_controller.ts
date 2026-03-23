import type { HttpContext } from '@adonisjs/core/http'

/**
 * ResolveFlaggedReviewController
 *
 * Resolve flagged review
 *
 * PUT /admin/reviews/:id/resolve
 */
export default class ResolveFlaggedReviewController {
  async handle({ inertia, response, params, session }: HttpContext) {
    // TODO Phase 1.4: Implement action/query logic
    session.flash('success', 'Action completed')
    response.redirect().back()
  }
}
