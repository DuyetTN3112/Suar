import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { buildReportReviewDisputeDTO } from '../mappers/request/review-core/review_request_mapper.js'

import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { wrapApiV1Data } from '#modules/http/boundary/api_v1_response'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { ReviewActionFactory } from '#modules/reviews/actions/ports/inbound/review_action_factory'

@inject()
export default class ReportReviewDisputeController {
  constructor(private readonly actions: ReviewActionFactory) {}

  async handle(ctx: HttpContext) {
    const dto = buildReportReviewDisputeDTO(ctx.request, ctx.params['disputeId'] as string)
    const result = await this.actions
      .makeReportReviewDisputeCommand(actionContextFromHttp(ctx))
      .executeAndWrap(dto)
      .then((outcome) => outcome.getValue())

    ctx.response.status(HttpStatus.OK)
    return wrapApiV1Data(result)
  }
}
