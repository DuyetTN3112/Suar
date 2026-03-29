import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import UpsertTaskSelfAssessmentCommand from '#actions/reviews/commands/upsert_task_self_assessment_command'
import { UpsertTaskSelfAssessmentDTO } from '#actions/reviews/dtos/request/review_dtos'

/**
 * POST /reviews/:id/self-assessment
 */
export default class UpsertTaskSelfAssessmentController {
  async handle(ctx: HttpContext) {
    const { request, response, params } = ctx

    const dto = new UpsertTaskSelfAssessmentDTO({
      review_session_id: params.id as string,
      overall_satisfaction: request.input('overall_satisfaction') as number | undefined,
      difficulty_felt: request.input('difficulty_felt') as string | undefined,
      confidence_level: request.input('confidence_level') as number | undefined,
      what_went_well: request.input('what_went_well') as string | undefined,
      what_would_do_different: request.input('what_would_do_different') as string | undefined,
      blockers_encountered: request.input('blockers_encountered') as string[] | undefined,
      skills_felt_lacking: request.input('skills_felt_lacking') as string[] | undefined,
      skills_felt_strong: request.input('skills_felt_strong') as string[] | undefined,
    })

    const result = await new UpsertTaskSelfAssessmentCommand(ExecutionContext.fromHttp(ctx)).handle(
      dto
    )

    response.status(200).json({ success: true, data: result })
  }
}
