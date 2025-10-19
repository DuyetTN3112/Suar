import type { HttpContext } from '@adonisjs/core/http'

/**
 * Legacy web route.
 * Product decision 2026-07-09: task-level review is disabled and moved to sprint close.
 */
export default class SubmitReverseReviewController {
  handle(ctx: HttpContext): void {
    const { response, session } = ctx
    session.flash(
      'error',
      'Review theo task đã tắt. Hãy dùng review người giao việc hoặc review môi trường làm việc sau khi kết thúc sprint.'
    )
    response.redirect().back()
  }
}
