import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { mapReviewDisputeEvidenceApiBody } from '../mappers/response/review-core/review_response_mapper.js'

import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { ReviewActionFactory } from '#modules/reviews/actions/ports/inbound/review_action_factory'

@inject()
export default class CreateReviewDisputeEvidenceController {
  constructor(private readonly actions: ReviewActionFactory) {}

  async handle(ctx: HttpContext) {
    const body = ctx.request.only(['evidence_type', 'evidenceType', 'url', 'title', 'description'])
    const evidence = await this.actions
      .makeCreateReviewDisputeEvidenceCommand(actionContextFromHttp(ctx))
      .executeAndWrap({
        dispute_id: ctx.params['disputeId'] as string,
        evidence_type: String(body.evidenceType ?? body.evidence_type ?? ''),
        url: String(body.url ?? ''),
        title: (body.title as string | null | undefined) ?? null,
        description: (body.description as string | null | undefined) ?? null,
      })
      .then((outcome) => outcome.getValue())

    ctx.response.status(HttpStatus.CREATED)
    return mapReviewDisputeEvidenceApiBody(evidence)
  }
}
