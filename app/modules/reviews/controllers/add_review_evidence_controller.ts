import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { buildAddReviewEvidenceDTO } from './mappers/request/review_request_mapper.js'
import { mapReviewDataApiBody } from './mappers/response/review_response_mapper.js'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { ReviewActionFactory } from '#modules/reviews/actions/ports/inbound/review_action_factory'

/**
 * POST /reviews/:id/evidences
 */
@inject()
export default class AddReviewEvidenceController {
  constructor(private readonly actions: ReviewActionFactory) {}

  async handle(ctx: HttpContext) {
    const { request, response, params } = ctx

    const dto = buildAddReviewEvidenceDTO(request, params['reviewId'] as string)

    const evidence = await this.actions
      .makeAddReviewEvidenceCommand(actionContextFromHttp(ctx))
      .handle(dto)

    response.status(201)
    return mapReviewDataApiBody(evidence)
  }
}
