import type { HttpContext } from '@adonisjs/core/http'

import { mapReviewEvidenceCollectionApiBody } from './mappers/response/review_response_mapper.js'

import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import { toCanonicalApiPagination } from '#modules/pagination/public_contracts/pagination_public_api'
import GetReviewEvidencesQuery from '#modules/reviews/actions/queries/get_review_evidences_query'

/**
 * GET /reviews/:id/evidences
 */
export default class GetReviewEvidencesController {
  async handle(ctx: HttpContext) {
    const { request, response, params } = ctx
    const query = new GetReviewEvidencesQuery(actionContextFromHttp(ctx))
    const result = await query.execute(params['reviewId'] as string, {
      page: request.input('page'),
      perPage:
        (request.input('perPage') as unknown) ??
        (request.input('per_page') as unknown) ??
        (request.input('limit') as unknown),
    })

    response.status(200)
    return {
      ...mapReviewEvidenceCollectionApiBody(result.data),
      pagination: toCanonicalApiPagination(result.meta),
    }
  }
}
