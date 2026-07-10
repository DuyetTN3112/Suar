import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { mapTaskSelfAssessmentApiBody } from '../mappers/response/review-core/review_response_mapper.js'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { ReviewActionFactory } from '#modules/reviews/actions/ports/inbound/review_action_factory'

/**
 * GET /reviews/:id/self-assessment
 */
@inject()
export default class GetTaskSelfAssessmentController {
  constructor(private readonly actions: ReviewActionFactory) {}

  async handle(ctx: HttpContext) {
    const { response, params } = ctx
    const query = this.actions.makeGetTaskSelfAssessmentQuery(actionContextFromHttp(ctx))
    const data = await query
      .executeAndWrap(params['reviewId'] as string)
      .then((outcome) => outcome.getValue())

    response.status(200)
    return mapTaskSelfAssessmentApiBody(data)
  }
}
