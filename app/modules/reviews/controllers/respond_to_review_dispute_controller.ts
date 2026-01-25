import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { buildRespondToReviewDisputeDTO } from './mappers/request/review_request_mapper.js'
import { mapReviewDisputeCommentApiBody } from './mappers/response/review_response_mapper.js'

import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { ReviewActionFactory } from '#modules/reviews/actions/ports/inbound/review_action_factory'

@inject()
export default class RespondToReviewDisputeController {
  constructor(private readonly actions: ReviewActionFactory) {}

  async handle(ctx: HttpContext) {
    const dto = buildRespondToReviewDisputeDTO(ctx.request, ctx.params['disputeId'] as string)
    const comment = await this.actions
      .makeRespondToReviewDisputeCommand(actionContextFromHttp(ctx))
      .execute(dto)

    ctx.response.status(HttpStatus.CREATED)
    return mapReviewDisputeCommentApiBody(comment)
  }
}
