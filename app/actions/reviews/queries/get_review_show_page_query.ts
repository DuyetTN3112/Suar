import GetReviewSessionQuery from './get_review_session_query.js'

import { GetReviewSessionDTO } from '#actions/reviews/dtos/request/review_dtos'
import { skillPublicApi } from '#actions/skills/public_api'
import { proficiencyLevelOptions } from '#constants/user_constants'
import type { DatabaseId } from '#types/database'
import type { ExecutionContext } from '#types/execution_context'

export interface GetReviewShowPageResult {
  session: Awaited<ReturnType<GetReviewSessionQuery['handle']>>
  skills: Awaited<ReturnType<typeof skillPublicApi.listActive>>
  proficiencyLevels: typeof proficiencyLevelOptions
}

export default class GetReviewShowPageQuery {
  constructor(protected execCtx: ExecutionContext) {}

  async execute(reviewSessionId: DatabaseId): Promise<GetReviewShowPageResult> {
    const [session, skills] = await Promise.all([
      new GetReviewSessionQuery(this.execCtx).handle(new GetReviewSessionDTO(reviewSessionId)),
      skillPublicApi.listActive(),
    ])

    return {
      session,
      skills,
      proficiencyLevels: proficiencyLevelOptions,
    }
  }
}
