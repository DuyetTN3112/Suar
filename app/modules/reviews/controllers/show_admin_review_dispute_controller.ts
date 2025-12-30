import type { HttpContext } from '@adonisjs/core/http'

import { mapReviewDataApiBody } from './mappers/response/review_response_mapper.js'

import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import GetAdminReviewDisputeDetailQuery from '#modules/reviews/actions/queries/get_admin_review_dispute_detail_query'

export default class ShowAdminReviewDisputeController {
  async handle(ctx: HttpContext) {
    const result = await new GetAdminReviewDisputeDetailQuery(actionContextFromHttp(ctx)).execute({
      dispute_id: ctx.params.id as string,
    })

    ctx.response.status(HttpStatus.OK).json(mapReviewDataApiBody(result))
  }
}
