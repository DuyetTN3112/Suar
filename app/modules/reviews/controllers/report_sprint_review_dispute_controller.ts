import type { HttpContext } from '@adonisjs/core/http'

import { mapReviewDataApiBody } from './mappers/response/review_response_mapper.js'

import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import ReportSprintReviewDisputeCommand from '#modules/reviews/actions/commands/report_sprint_review_dispute_command'

export default class ReportSprintReviewDisputeController {
  async handle(ctx: HttpContext) {
    const result = await new ReportSprintReviewDisputeCommand(actionContextFromHttp(ctx)).execute({
      dispute_id: ctx.params['disputeId'] as string,
      escalation_reason: String(
        ctx.request.input('escalationReason', ctx.request.input('escalation_reason', ''))
      ),
    })

    ctx.response.status(HttpStatus.CREATED)
    return mapReviewDataApiBody(result)
  }
}
