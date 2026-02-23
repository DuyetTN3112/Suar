import type { HttpContext } from '@adonisjs/core/http'


import { buildUpsertTaskSelfAssessmentDTO } from './mappers/request/review_request_mapper.js'
import { mapTaskSelfAssessmentApiBody } from './mappers/response/review_response_mapper.js'

import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import UpsertTaskSelfAssessmentCommand from '#modules/reviews/actions/commands/upsert_task_self_assessment_command'

/**
 * POST /reviews/:id/self-assessment
 */
export default class UpsertTaskSelfAssessmentController {
  async handle(ctx: HttpContext) {
    const { request, response, params } = ctx

    const dto = buildUpsertTaskSelfAssessmentDTO(request, params['reviewId'] as string)

    const result = await new UpsertTaskSelfAssessmentCommand(actionContextFromHttp(ctx)).handle(
      dto
    )

    response.status(200)
    return mapTaskSelfAssessmentApiBody(result)
  }
}
