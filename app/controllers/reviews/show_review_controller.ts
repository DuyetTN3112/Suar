import type { HttpContext } from '@adonisjs/core/http'
import GetReviewSessionQuery from '#actions/reviews/queries/get_review_session_query'
import GetActiveSkillsQuery from '#actions/shared/queries/get_active_skills_query'
import { GetReviewSessionDTO } from '#actions/reviews/dtos/request/review_dtos'
import { proficiencyLevelOptions } from '#constants/user_constants'

/**
 * GET /reviews/:id → Show review session details
 */
export default class ShowReviewController {
  async handle(ctx: HttpContext) {
    const { params, inertia } = ctx

    const [session, skills] = await Promise.all([
      new GetReviewSessionQuery(ctx).handle(new GetReviewSessionDTO(params.id as string)),
      GetActiveSkillsQuery.execute(),
    ])

    const proficiencyLevels = proficiencyLevelOptions

    return inertia.render('reviews/show', {
      session: session.serialize(),
      skills,
      proficiencyLevels,
    })
  }
}
