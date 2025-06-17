import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import ResolveFlaggedReviewCommand from '#actions/reviews/commands/resolve_flagged_review_command'
import type { ResolveFlaggedReviewDTO } from '#actions/reviews/commands/resolve_flagged_review_command'
import BusinessLogicException from '#exceptions/business_logic_exception'

/**
 * POST /admin/flagged-reviews/:id/resolve → Resolve a flagged review (dismiss or confirm)
 */
export default class ResolveFlaggedReviewController {
  async handle(ctx: HttpContext) {
    const { request, response, params, session } = ctx

    const action = request.input('action') as string
    if (action !== 'dismissed' && action !== 'confirmed') {
      throw new BusinessLogicException('action must be "dismissed" or "confirmed"')
    }

    const dto: ResolveFlaggedReviewDTO = {
      flagged_review_id: params.id as string,
      action: action,
      notes: request.input('notes') as string | null,
    }

    const command = new ResolveFlaggedReviewCommand(ExecutionContext.fromHttp(ctx))
    await command.handle(dto)

    const message =
      dto.action === 'dismissed'
        ? 'Flagged review đã được bỏ qua'
        : 'Flagged review đã được xác nhận là bất thường'
    session.flash('success', message)

    response.redirect().back()
  }
}
