import type { HttpContext } from '@adonisjs/core/http'

import { mapReviewEvidenceCollectionApiBody } from './mappers/response/review_response_mapper.js'

import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import ListReviewDisputeEvidencesQuery from '#modules/reviews/actions/queries/list_review_dispute_evidences_query'

export default class ListReviewDisputeEvidencesController {
  async handle(ctx: HttpContext) {
    const evidences = await new ListReviewDisputeEvidencesQuery(actionContextFromHttp(ctx)).execute(
      {
        dispute_id: ctx.params['disputeId'] as string,
      }
    )

    ctx.response.status(HttpStatus.OK)
    return mapReviewEvidenceCollectionApiBody(evidences)
  }
}
