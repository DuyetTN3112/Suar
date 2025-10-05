import type { HttpContext } from '@adonisjs/core/http'

import { mapReviewDataApiBody } from './mappers/response/review_response_mapper.js'

import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import GetAdminReviewDisputeDetailQuery from '#modules/reviews/actions/queries/get_admin_review_dispute_detail_query'

export default class ShowAdminReviewDisputeController {
  async handle(ctx: HttpContext) {
    const result = await new GetAdminReviewDisputeDetailQuery(actionContextFromHttp(ctx)).execute({
      disputeId: ctx.params['disputeId'] as string,
    })

    ctx.response.status(HttpStatus.OK)
    return mapReviewDataApiBody(result)
  }
}
