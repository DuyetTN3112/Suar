import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { buildUpsertTaskSelfAssessmentDTO } from './mappers/request/review_request_mapper.js'
import { mapTaskSelfAssessmentApiBody } from './mappers/response/review_response_mapper.js'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { ReviewActionFactory } from '#modules/reviews/actions/ports/inbound/review_action_factory'

/**
 * POST /reviews/:id/self-assessment
 */
@inject()
export default class UpsertTaskSelfAssessmentController {
  constructor(private readonly actions: ReviewActionFactory) {}

  async handle(ctx: HttpContext) {
    const { request, response, params } = ctx

    const dto = buildUpsertTaskSelfAssessmentDTO(request, params['reviewId'] as string)

    const result = await this.actions
      .makeUpsertTaskSelfAssessmentCommand(actionContextFromHttp(ctx))
      .handle(dto)

    response.status(200)
    return mapTaskSelfAssessmentApiBody(result)
  }
}
