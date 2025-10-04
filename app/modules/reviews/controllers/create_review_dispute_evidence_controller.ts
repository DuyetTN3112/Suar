import type { HttpContext } from '@adonisjs/core/http'

import { mapReviewDisputeEvidenceApiBody } from './mappers/response/review_response_mapper.js'

import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import CreateReviewDisputeEvidenceCommand from '#modules/reviews/actions/commands/create_review_dispute_evidence_command'

export default class CreateReviewDisputeEvidenceController {
  async handle(ctx: HttpContext) {
    const body = ctx.request.only(['evidence_type', 'evidenceType', 'url', 'title', 'description'])
    const evidence = await new CreateReviewDisputeEvidenceCommand(actionContextFromHttp(ctx)).execute({
      dispute_id: ctx.params['disputeId'] as string,
      evidence_type: String(body.evidenceType ?? body.evidence_type ?? ''),
      url: String(body.url ?? ''),
      title: (body.title as string | null | undefined) ?? null,
      description: (body.description as string | null | undefined) ?? null,
    })

    ctx.response.status(HttpStatus.CREATED)
    return mapReviewDisputeEvidenceApiBody(evidence)
  }
}
