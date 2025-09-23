import type { HttpContext } from '@adonisjs/core/http'

import { mapReviewCommentCollectionApiBody } from './mappers/response/review_response_mapper.js'

import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import ListReviewDisputeEvidencesQuery from '#modules/reviews/actions/queries/list_review_dispute_evidences_query'

export default class ListReviewDisputeEvidencesController {
  async handle(ctx: HttpContext) {
    const evidences = await new ListReviewDisputeEvidencesQuery(actionContextFromHttp(ctx)).execute(
      {
        dispute_id: ctx.params.id as string,
      }
    )

    ctx.response.status(HttpStatus.OK).json(mapReviewCommentCollectionApiBody(evidences))
  }
}
