import type { HttpContext } from '@adonisjs/core/http'

import { mapReviewEvidenceCollectionApiBody } from './mappers/response/review_response_mapper.js'

import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import GetReviewEvidencesQuery from '#modules/reviews/actions/queries/get_review_evidences_query'

/**
 * GET /reviews/:id/evidences
 */
export default class GetReviewEvidencesController {
  async handle(ctx: HttpContext) {
    const { response, params } = ctx
    const query = new GetReviewEvidencesQuery(actionContextFromHttp(ctx))
    const data = await query.execute(params.id as string)

    response.status(200).json(mapReviewEvidenceCollectionApiBody(data))
  }
}
