import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import ResolveFlaggedReviewCommand from '#actions/admin/reviews/commands/resolve_flagged_review_command'

/**
 * ResolveFlaggedReviewController
 *
 * Resolve flagged review
 *
 * PUT /admin/reviews/:id/resolve
 */
export default class ResolveFlaggedReviewController {
  async handle(ctx: HttpContext) {
    const { request, response, session, params } = ctx
    const rawId: unknown = params.id
    if (typeof rawId !== 'string' || rawId.length === 0) {
      throw new Error('Invalid flagged review id')
    }

    const rawAction: unknown = request.input('action', 'confirm')
    if (rawAction !== 'confirm' && rawAction !== 'dismiss') {
      throw new Error('Invalid resolve action')
    }

    const notes = request.input('notes') as string | undefined
    const command = new ResolveFlaggedReviewCommand(ExecutionContext.fromHttp(ctx))

    await command.handle({
      flaggedReviewId: rawId,
      action: rawAction,
      notes,
    })

    const successMessage =
      rawAction === 'confirm' ? 'Đã xác nhận flagged review' : 'Đã bỏ qua flagged review'

    if (request.accepts(['html', 'json']) === 'json') {
      response.json({ success: true, message: successMessage })
      return
    }

    session.flash('success', successMessage)
    response.redirect().back()
  }
}
