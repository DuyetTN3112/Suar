import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { mapReviewDataApiBody } from '../mappers/response/review-core/review_response_mapper.js'

import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { ReviewActionFactory } from '#modules/reviews/actions/ports/inbound/review_action_factory'

@inject()
export default class BuildReviewDisputeCaseFileController {
  constructor(private readonly actions: ReviewActionFactory) {}

  async handle(ctx: HttpContext) {
    const caseFile = await this.actions
      .makeBuildReviewDisputeCaseFileCommand(actionContextFromHttp(ctx))
      .executeAndWrap({
        dispute_id: ctx.params['disputeId'] as string,
      })
      .then((outcome) => outcome.getValue())

    ctx.response.status(HttpStatus.CREATED)
    return mapReviewDataApiBody(caseFile)
  }
}
