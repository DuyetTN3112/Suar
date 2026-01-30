import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { mapReviewEvidenceCollectionApiBody } from './mappers/response/review_response_mapper.js'

import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { ReviewActionFactory } from '#modules/reviews/actions/ports/inbound/review_action_factory'

@inject()
export default class ListReviewDisputeEvidencesController {
  constructor(private readonly actions: ReviewActionFactory) {}

  async handle(ctx: HttpContext) {
    const evidences = await this.actions
      .makeListReviewDisputeEvidencesQuery(actionContextFromHttp(ctx))
      .execute({
        dispute_id: ctx.params['disputeId'] as string,
      })

    ctx.response.status(HttpStatus.OK)
    return mapReviewEvidenceCollectionApiBody(evidences)
  }
}
