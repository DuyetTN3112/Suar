import type { HttpContext } from '@adonisjs/core/http'

import { mapReviewCollectionApiBody } from './mappers/response/review_response_mapper.js'

import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import ListAiDisputeEvaluationsQuery from '#modules/reviews/actions/queries/list_ai_dispute_evaluations_query'

export default class ListAiDisputeEvaluationsController {
  async handle(ctx: HttpContext) {
    const evaluations = await new ListAiDisputeEvaluationsQuery(actionContextFromHttp(ctx)).execute({
      dispute_id: ctx.params['disputeId'] as string,
    })

    ctx.response.status(HttpStatus.OK)
    return mapReviewCollectionApiBody(evaluations)
  }
}
