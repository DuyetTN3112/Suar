import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import ResolveFlaggedReviewCommand from '#actions/reviews/commands/resolve_flagged_review_command'
import { buildResolveFlaggedReviewDTO } from './mappers/request/review_request_mapper.js'

/**
 * POST /admin/flagged-reviews/:id/resolve → Resolve a flagged review (dismiss or confirm)
 */
export default class ResolveFlaggedReviewController {
  async handle(ctx: HttpContext) {
    const { request, response, params, session } = ctx

    const dto = buildResolveFlaggedReviewDTO(request, params.id as string)

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
