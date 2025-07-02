import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import GetReviewSessionQuery from '#actions/reviews/queries/get_review_session_query'
import GetActiveSkillsQuery from '#actions/shared/queries/get_active_skills_query'
import { proficiencyLevelOptions } from '#constants/user_constants'
import { buildGetReviewSessionDTO } from './mapper/request/review_request_mapper.js'
import { mapShowReviewPageProps } from './mapper/response/review_response_mapper.js'

/**
 * GET /reviews/:id → Show review session details
 */
export default class ShowReviewController {
  async handle(ctx: HttpContext) {
    const { params, inertia } = ctx

    const [session, skills] = await Promise.all([
      new GetReviewSessionQuery(ExecutionContext.fromHttp(ctx)).handle(
        buildGetReviewSessionDTO(params.id as string)
      ),
      GetActiveSkillsQuery.execute(),
    ])

    const proficiencyLevels = proficiencyLevelOptions

    return inertia.render(
      'reviews/show',
      mapShowReviewPageProps(session, skills, proficiencyLevels)
    )
  }
}
