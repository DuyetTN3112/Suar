import type { HttpContext } from '@adonisjs/core/http'

/**
 * ListFlaggedReviewsController
 *
 * Show flagged reviews
 *
 * GET /admin/reviews
 */
export default class ListFlaggedReviewsController {
  async handle({ inertia }: HttpContext) {
    // TODO: Implement flagged reviews repository and query
    // This feature requires review flagging system to be implemented first
    return inertia.render('admin/reviews/flagged', {
      reviews: [],
      meta: {
        total: 0,
        perPage: 50,
        currentPage: 1,
        lastPage: 1,
      },
    })
  }
}
