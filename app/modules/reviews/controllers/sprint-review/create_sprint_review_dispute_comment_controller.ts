import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { mapReviewDataApiBody } from '../mappers/response/review-core/review_response_mapper.js'

import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { ReviewActionFactory } from '#modules/reviews/actions/ports/inbound/review_action_factory'

@inject()
export default class CreateSprintReviewDisputeCommentController {
  constructor(private readonly actions: ReviewActionFactory) {}

  async handle(ctx: HttpContext) {
    const result = await this.actions
      .makeCreateSprintReviewDisputeCommentCommand(actionContextFromHttp(ctx))
      .executeAndWrap({
        dispute_id: ctx.params['disputeId'] as string,
        body: String(ctx.request.input('body', '')),
        visibility: ctx.request.input('visibility', 'all_parties') as
          | 'all_parties'
          | 'admin_only',
      })
      .then((outcome) => outcome.getValue())

    ctx.response.status(HttpStatus.CREATED)
    return mapReviewDataApiBody(result)
  }
}
