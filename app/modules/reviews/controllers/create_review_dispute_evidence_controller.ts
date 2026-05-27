import type { HttpContext } from '@adonisjs/core/http'

import { mapReviewDisputeCommentApiBody } from './mappers/response/review_response_mapper.js'

import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import CreateReviewDisputeEvidenceCommand from '#modules/reviews/actions/commands/create_review_dispute_evidence_command'

export default class CreateReviewDisputeEvidenceController {
  async handle(ctx: HttpContext) {
    const body = ctx.request.only(['evidence_type', 'url', 'title', 'description'])
    const evidence = await new CreateReviewDisputeEvidenceCommand(actionContextFromHttp(ctx)).execute({
      dispute_id: ctx.params.id as string,
      evidence_type: String(body.evidence_type ?? ''),
      url: String(body.url ?? ''),
      title: (body.title as string | null | undefined) ?? null,
      description: (body.description as string | null | undefined) ?? null,
    })

    ctx.response.status(HttpStatus.CREATED).json(mapReviewDisputeCommentApiBody(evidence))
  }
}
