import type { HttpContext } from '@adonisjs/core/http'

import { buildReportReviewDisputeDTO } from './mappers/request/review_request_mapper.js'

import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { wrapApiV1Data } from '#modules/http/api_v1/response_mappers'
import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import ReportReviewDisputeCommand from '#modules/reviews/actions/commands/report_review_dispute_command'

export default class ReportReviewDisputeController {
  async handle(ctx: HttpContext) {
    const dto = buildReportReviewDisputeDTO(ctx.request, ctx.params['disputeId'] as string)
    const result = await new ReportReviewDisputeCommand(actionContextFromHttp(ctx)).execute(dto)

    ctx.response.status(HttpStatus.OK)
    return wrapApiV1Data(result)
  }
}
