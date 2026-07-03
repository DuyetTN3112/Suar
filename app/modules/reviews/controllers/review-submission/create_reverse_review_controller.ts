import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { buildSubmitReverseReviewDTO } from '../mappers/request/review-core/review_request_mapper.js'
import { mapReviewDataApiBody } from '../mappers/response/review-core/review_response_mapper.js'

import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { ReviewActionFactory } from '#modules/reviews/actions/ports/inbound/review_action_factory'

@inject()
export default class CreateReverseReviewController {
  constructor(private readonly actions: ReviewActionFactory) {}

  async handle(ctx: HttpContext) {
    const dto = buildSubmitReverseReviewDTO(ctx.request, ctx.params['sessionId'] as string)
    const reverseReview = await this.actions
      .makeSubmitReverseReviewCommand(actionContextFromHttp(ctx))
      .executeAndWrap(dto)
      .then((outcome) => outcome.getValue())

    ctx.response.status(HttpStatus.CREATED)
    return mapReviewDataApiBody(reverseReview)
  }
}
