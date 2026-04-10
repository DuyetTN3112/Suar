import GetActiveSkillsQuery from '#actions/shared/queries/get_active_skills_query'
import { proficiencyLevelOptions } from '#constants/user_constants'
import type { ExecutionContext } from '#types/execution_context'
import type { DatabaseId } from '#types/database'
import { GetReviewSessionDTO } from '#actions/reviews/dtos/request/review_dtos'
import GetReviewSessionQuery from './get_review_session_query.js'

export interface GetReviewShowPageResult {
  session: Awaited<ReturnType<GetReviewSessionQuery['handle']>>
  skills: Awaited<ReturnType<typeof GetActiveSkillsQuery.execute>>
  proficiencyLevels: typeof proficiencyLevelOptions
}

export default class GetReviewShowPageQuery {
  constructor(protected execCtx: ExecutionContext) {}

  async execute(reviewSessionId: DatabaseId): Promise<GetReviewShowPageResult> {
    const [session, skills] = await Promise.all([
      new GetReviewSessionQuery(this.execCtx).handle(new GetReviewSessionDTO(reviewSessionId)),
      GetActiveSkillsQuery.execute(),
    ])

    return {
      session,
      skills,
      proficiencyLevels: proficiencyLevelOptions,
    }
  }
}
