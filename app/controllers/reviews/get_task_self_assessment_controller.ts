import type { HttpContext } from '@adonisjs/core/http'
import GetTaskSelfAssessmentQuery from '#actions/reviews/queries/get_task_self_assessment_query'

/**
 * GET /reviews/:id/self-assessment
 */
export default class GetTaskSelfAssessmentController {
  async handle(ctx: HttpContext) {
    const { response, params } = ctx
    const query = new GetTaskSelfAssessmentQuery()
    const data = await query.execute(params.id as string)

    response.status(200).json({ success: true, data })
  }
}
