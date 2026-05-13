import type { HttpContext } from '@adonisjs/core/http'

import { buildUpsertTaskSelfAssessmentDTO } from './mappers/request/review_request_mapper.js'
import { mapReviewDataApiBody } from './mappers/response/review_response_mapper.js'

import UpsertTaskSelfAssessmentCommand from '#actions/reviews/commands/upsert_task_self_assessment_command'
import { ExecutionContext } from '#types/execution_context'

/**
 * POST /reviews/:id/self-assessment
 */
export default class UpsertTaskSelfAssessmentController {
  async handle(ctx: HttpContext) {
    const { request, response, params } = ctx

    const dto = buildUpsertTaskSelfAssessmentDTO(request, params.id as string)

    const result = await new UpsertTaskSelfAssessmentCommand(ExecutionContext.fromHttp(ctx)).handle(
      dto
    )

    response.status(200).json(mapReviewDataApiBody(result))
  }
}
