import type { HttpContext } from '@adonisjs/core/http'

import { mapTaskSelfAssessmentApiBody } from './mappers/response/review_response_mapper.js'

import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import GetTaskSelfAssessmentQuery from '#modules/reviews/actions/queries/get_task_self_assessment_query'

/**
 * GET /reviews/:id/self-assessment
 */
export default class GetTaskSelfAssessmentController {
  async handle(ctx: HttpContext) {
    const { response, params } = ctx
    const query = new GetTaskSelfAssessmentQuery(actionContextFromHttp(ctx))
    const data = await query.execute(params.id as string)

    response.status(200).json(mapTaskSelfAssessmentApiBody(data))
  }
}
