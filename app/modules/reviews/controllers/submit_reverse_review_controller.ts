import type { HttpContext } from '@adonisjs/core/http'

import { buildSubmitReverseReviewDTO } from './mappers/request/review_request_mapper.js'

import SubmitReverseReviewCommand from '#actions/reviews/commands/submit_reverse_review_command'
import { ExecutionContext } from '#types/execution_context'

/**
 * POST /reviews/:id/reverse → Submit reverse review (reviewee rating reviewer)
 */
export default class SubmitReverseReviewController {
  async handle(ctx: HttpContext) {
    const { request, response, params, session } = ctx

    const dto = buildSubmitReverseReviewDTO(request, params.id as string)

    const command = new SubmitReverseReviewCommand(ExecutionContext.fromHttp(ctx))
    await command.handle(dto)

    session.flash('success', 'Đánh giá ngược đã được gửi thành công')

    response.redirect().back()
  }
}
