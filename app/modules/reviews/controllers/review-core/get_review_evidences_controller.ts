import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { mapReviewEvidenceCollectionApiBody } from '../mappers/response/review-core/review_response_mapper.js'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { toCanonicalApiPagination } from '#modules/pagination/public_contracts/pagination_public_api'
import { ReviewActionFactory } from '#modules/reviews/actions/ports/inbound/review_action_factory'

/**
 * GET /reviews/:id/evidences
 */
@inject()
export default class GetReviewEvidencesController {
  constructor(private readonly actions: ReviewActionFactory) {}

  async handle(ctx: HttpContext) {
    const { request, response, params } = ctx
    const query = this.actions.makeGetReviewEvidencesQuery(actionContextFromHttp(ctx))
    const result = await query
      .executeAndWrap(params['reviewId'] as string, {
        page: request.input('page'),
        perPage:
          (request.input('perPage') as unknown) ??
          (request.input('per_page') as unknown) ??
          (request.input('limit') as unknown),
      })
      .then((outcome) => outcome.getValue())

    response.status(200)
    return {
      ...mapReviewEvidenceCollectionApiBody(result.data),
      pagination: toCanonicalApiPagination(result.meta),
    }
  }
}
