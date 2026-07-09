import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { buildStartAiDisputeEvaluationDTO } from '../mappers/request/review-core/review_request_mapper.js'
import { mapReviewDataApiBody } from '../mappers/response/review-core/review_response_mapper.js'

import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { ReviewActionFactory } from '#modules/reviews/actions/ports/inbound/review_action_factory'

@inject()
export default class StartAiDisputeEvaluationController {
  constructor(private readonly actions: ReviewActionFactory) {}

  async handle(ctx: HttpContext) {
    const dto = buildStartAiDisputeEvaluationDTO(ctx.request, ctx.params['disputeId'] as string)
    const command = this.actions.makeStartAiDisputeEvaluationCommand(actionContextFromHttp(ctx))
    const evaluation = await command.executeAndWrap(dto).then((outcome) => outcome.getValue())

    ctx.response.status(HttpStatus.CREATED)
    return mapReviewDataApiBody(evaluation)
  }
}
