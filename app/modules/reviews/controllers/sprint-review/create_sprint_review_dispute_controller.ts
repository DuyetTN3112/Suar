import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { mapReviewDataApiBody } from '../mappers/response/review-core/review_response_mapper.js'

import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { ReviewActionFactory } from '#modules/reviews/actions/ports/inbound/review_action_factory'

@inject()
export default class CreateSprintReviewDisputeController {
  constructor(private readonly actions: ReviewActionFactory) {}

  async handle(ctx: HttpContext) {
    const disputeReviewType = ctx.request.input(
      'disputeReviewType',
      ctx.request.input('dispute_review_type', undefined)
    ) as 'manager_review' | 'environment_review' | undefined
    const dto: {
      package_id: string
      dispute_reason: string
      requested_outcome: 'add_context' | 'remove_review' | 'request_admin_review' | 'other'
      dispute_review_type?: 'manager_review' | 'environment_review'
    } = {
      package_id: ctx.params['packageId'] as string,
      dispute_reason: String(
        ctx.request.input('disputeReason', ctx.request.input('dispute_reason', ''))
      ),
      requested_outcome: String(
        ctx.request.input('requestedOutcome', ctx.request.input('requested_outcome', 'other'))
      ) as 'add_context' | 'remove_review' | 'request_admin_review' | 'other',
    }
    if (disputeReviewType) {
      dto.dispute_review_type = disputeReviewType
    }

    const result = await this.actions
      .makeCreateSprintReviewDisputeCommand(actionContextFromHttp(ctx))
      .executeAndWrap(dto)
      .then((outcome) => outcome.getValue())

    ctx.response.status(HttpStatus.CREATED)
    return mapReviewDataApiBody(result)
  }
}
