import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { mapReviewDataApiBody } from '../mappers/response/review-core/review_response_mapper.js'

import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { ReviewActionFactory } from '#modules/reviews/actions/ports/inbound/review_action_factory'

@inject()
export default class ApproveAiProfileCapabilityProposalController {
  constructor(private readonly actions: ReviewActionFactory) {}

  async handle(ctx: HttpContext) {
    const proposalIndex = Number(ctx.params['proposalIndex'])
    if (!Number.isSafeInteger(proposalIndex) || proposalIndex < 0) {
      throw ValidationException.field('proposalIndex', 'Chỉ số đề xuất năng lực không hợp lệ')
    }
    const result = await this.actions
      .makeApproveAiProfileCapabilityProposalCommand(actionContextFromHttp(ctx))
      .executeAndWrap({
        disputeId: ctx.params['disputeId'] as string,
        evaluationId: ctx.params['evaluationId'] as string,
        proposalIndex,
      })
      .then((outcome) => outcome.getValue())

    ctx.response.status(HttpStatus.CREATED)
    return mapReviewDataApiBody(result)
  }
}
