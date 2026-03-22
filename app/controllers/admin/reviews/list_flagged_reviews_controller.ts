import type { HttpContext } from '@adonisjs/core/http'

/**
 * ListFlaggedReviewsController
 *
 * Show flagged reviews
 *
 * GET /admin/reviews
 */
export default class ListFlaggedReviewsController {
  async handle({ inertia, response, params, session }: HttpContext) {
    // TODO Phase 1.4: Implement action/query logic
    return inertia.render('admin/reviews/flagged', {})
  }
}
