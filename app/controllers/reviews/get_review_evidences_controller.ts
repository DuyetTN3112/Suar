import type { HttpContext } from '@adonisjs/core/http'
import GetReviewEvidencesQuery from '#actions/reviews/queries/get_review_evidences_query'
import { mapReviewEvidenceCollectionApiBody } from './mapper/response/review_response_mapper.js'

/**
 * GET /reviews/:id/evidences
 */
export default class GetReviewEvidencesController {
  async handle(ctx: HttpContext) {
    const { response, params } = ctx
    const query = new GetReviewEvidencesQuery()
    const data = await query.execute(params.id as string)

    response.status(200).json(mapReviewEvidenceCollectionApiBody(data))
  }
}
