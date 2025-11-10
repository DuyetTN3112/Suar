import type { HttpContext } from '@adonisjs/core/http'


import { buildUpsertTaskSelfAssessmentDTO } from './mappers/request/review_request_mapper.js'
import { mapReviewDataApiBody } from './mappers/response/review_response_mapper.js'

import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import UpsertTaskSelfAssessmentCommand from '#modules/reviews/actions/commands/upsert_task_self_assessment_command'

/**
 * POST /reviews/:id/self-assessment
 */
export default class UpsertTaskSelfAssessmentController {
  async handle(ctx: HttpContext) {
    const { request, response, params } = ctx

    const dto = buildUpsertTaskSelfAssessmentDTO(request, params.id as string)

    const result = await new UpsertTaskSelfAssessmentCommand(actionContextFromHttp(ctx)).handle(
      dto
    )

    response.status(200).json(mapReviewDataApiBody(result))
  }
}
