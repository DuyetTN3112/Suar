import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import AddReviewEvidenceCommand from '#actions/reviews/commands/add_review_evidence_command'
import { buildAddReviewEvidenceDTO } from './mapper/request/review_request_mapper.js'
import { mapReviewDataApiBody } from './mapper/response/review_response_mapper.js'

/**
 * POST /reviews/:id/evidences
 */
export default class AddReviewEvidenceController {
  async handle(ctx: HttpContext) {
    const { request, response, params } = ctx

    const dto = buildAddReviewEvidenceDTO(request, params.id as string)

    const evidence = await new AddReviewEvidenceCommand(ExecutionContext.fromHttp(ctx)).handle(dto)

    response.status(201).json(mapReviewDataApiBody(evidence))
  }
}
