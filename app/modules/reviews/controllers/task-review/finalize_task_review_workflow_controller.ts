import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { ReviewActionFactory } from '#modules/reviews/actions/ports/inbound/review_action_factory'
import { requireRouteParam } from '#modules/reviews/controllers/mappers/request/review-core/route_params'
import { mapReviewDataApiBody } from '#modules/reviews/controllers/mappers/response/review-core/review_response_mapper'

@inject()
export default class FinalizeTaskReviewWorkflowController {
  constructor(private readonly actions: ReviewActionFactory) {}

  async handle(ctx: HttpContext) {
    const workflowId = requireRouteParam(ctx.params, 'workflowId')
    const outcome = await this.actions
      .makeFinalizeTaskReviewWorkflowCommand(actionContextFromHttp(ctx))
      .executeAndWrap({ workflowId })
      .then((result) => result.getValue())

    ctx.response.status(HttpStatus.OK)
    return mapReviewDataApiBody(outcome)
  }
}
