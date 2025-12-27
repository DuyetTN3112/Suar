import type { HttpContext } from '@adonisjs/core/http'

import { buildStartAiDisputeEvaluationDTO } from './mappers/request/review_request_mapper.js'
import { mapReviewDataApiBody } from './mappers/response/review_response_mapper.js'

import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import StartAiDisputeEvaluationCommand from '#modules/reviews/actions/commands/start_ai_dispute_evaluation_command'

export default class StartAiDisputeEvaluationController {
  async handle(ctx: HttpContext) {
    const dto = buildStartAiDisputeEvaluationDTO(ctx.request, ctx.params.id as string)
    const evaluation = await new StartAiDisputeEvaluationCommand(actionContextFromHttp(ctx)).execute(
      dto
    )

    ctx.response.status(HttpStatus.CREATED).json(mapReviewDataApiBody(evaluation))
  }
}
