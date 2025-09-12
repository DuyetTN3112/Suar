import type { HttpContext } from '@adonisjs/core/http'

import { mapReviewCollectionApiBody } from './mappers/response/review_response_mapper.js'

import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import ListAiDisputeEvaluationsQuery from '#modules/reviews/actions/queries/list_ai_dispute_evaluations_query'

export default class ListAiDisputeEvaluationsController {
  async handle(ctx: HttpContext) {
    const evaluations = await new ListAiDisputeEvaluationsQuery(actionContextFromHttp(ctx)).execute({
      dispute_id: ctx.params.id as string,
    })

    ctx.response.status(HttpStatus.OK).json(mapReviewCollectionApiBody(evaluations))
  }
}
