import type { HttpContext } from '@adonisjs/core/http'


import { buildAddReviewEvidenceDTO } from './mappers/request/review_request_mapper.js'
import { mapReviewDataApiBody } from './mappers/response/review_response_mapper.js'

import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import AddReviewEvidenceCommand from '#modules/reviews/actions/commands/add_review_evidence_command'

/**
 * POST /reviews/:id/evidences
 */
export default class AddReviewEvidenceController {
  async handle(ctx: HttpContext) {
    const { request, response, params } = ctx

    const dto = buildAddReviewEvidenceDTO(request, params['reviewId'] as string)

    const evidence = await new AddReviewEvidenceCommand(actionContextFromHttp(ctx)).handle(dto)

    response.status(201)
    return mapReviewDataApiBody(evidence)
  }
}
