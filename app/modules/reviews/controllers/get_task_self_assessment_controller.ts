import type { HttpContext } from '@adonisjs/core/http'

import { mapTaskSelfAssessmentApiBody } from './mappers/response/review_response_mapper.js'

import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import GetTaskSelfAssessmentQuery from '#modules/reviews/actions/queries/get_task_self_assessment_query'

/**
 * GET /reviews/:id/self-assessment
 */
export default class GetTaskSelfAssessmentController {
  async handle(ctx: HttpContext) {
    const { response, params } = ctx
    const query = new GetTaskSelfAssessmentQuery(actionContextFromHttp(ctx))
    const data = await query.execute(params['reviewId'] as string)

    response.status(200)
    return mapTaskSelfAssessmentApiBody(data)
  }
}
