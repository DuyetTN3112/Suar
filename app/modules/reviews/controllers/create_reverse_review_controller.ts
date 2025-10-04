import type { HttpContext } from '@adonisjs/core/http'

import { buildSubmitReverseReviewDTO } from './mappers/request/review_request_mapper.js'
import { mapReviewDataApiBody } from './mappers/response/review_response_mapper.js'

import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import SubmitReverseReviewCommand from '#modules/reviews/actions/commands/submit_reverse_review_command'

export default class CreateReverseReviewController {
  async handle(ctx: HttpContext) {
    const dto = buildSubmitReverseReviewDTO(ctx.request, ctx.params['sessionId'] as string)
    const reverseReview = await new SubmitReverseReviewCommand(actionContextFromHttp(ctx)).handle(dto)

    ctx.response.status(HttpStatus.CREATED)
    return mapReviewDataApiBody(reverseReview)
  }
}
