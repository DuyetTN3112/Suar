import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import AddReviewEvidenceCommand from '#actions/reviews/commands/add_review_evidence_command'
import { AddReviewEvidenceDTO } from '#actions/reviews/dtos/request/review_dtos'

/**
 * POST /reviews/:id/evidences
 */
export default class AddReviewEvidenceController {
  async handle(ctx: HttpContext) {
    const { request, response, params } = ctx

    const dto = new AddReviewEvidenceDTO({
      review_session_id: params.id as string,
      evidence_type: request.input('evidence_type') as string,
      url: request.input('url') as string | undefined,
      title: request.input('title') as string | undefined,
      description: request.input('description') as string | undefined,
    })

    const evidence = await new AddReviewEvidenceCommand(ExecutionContext.fromHttp(ctx)).handle(dto)

    response.status(201).json({ success: true, data: evidence })
  }
}
