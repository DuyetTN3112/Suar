import type { HttpContext } from '@adonisjs/core/http'

import { buildResolveFlaggedReviewDTO } from './mappers/request/review_request_mapper.js'

import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import ResolveFlaggedReviewCommand from '#modules/reviews/actions/commands/resolve_flagged_review_command'

/**
 * POST /admin/flagged-reviews/:flaggedReviewId/resolve → Resolve a flagged review (dismiss or confirm)
 */
export default class ResolveFlaggedReviewController {
  async handle(ctx: HttpContext) {
    const { request, response, params, session } = ctx

    const dto = buildResolveFlaggedReviewDTO(request, params['flaggedReviewId'] as string)

    const command = new ResolveFlaggedReviewCommand(actionContextFromHttp(ctx))
    await command.handle(dto)

    const message =
      dto.action === 'dismissed'
        ? 'Flagged review đã được bỏ qua'
        : 'Flagged review đã được xác nhận là bất thường'
    session.flash('success', message)

    response.redirect().back()
  }
}
