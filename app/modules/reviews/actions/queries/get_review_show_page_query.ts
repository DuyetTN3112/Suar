import db from '@adonisjs/lucid/services/db'

import GetReviewSessionQuery from './get_review_session_query.js'

import { GetReviewSessionDTO } from '#modules/reviews/actions/dtos/request/review_dtos'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { skillPublicApi } from '#modules/skills/public_contracts/skill_public_api'
import { proficiencyLevelOptions } from '#modules/users/public_contracts/user_constants'

export interface GetReviewShowPageResult {
  session: Awaited<ReturnType<GetReviewSessionQuery['handle']>>
  skills: Awaited<ReturnType<typeof skillPublicApi.listActive>>
  proficiencyLevels: typeof proficiencyLevelOptions
  disputeId: string | null
}

export default class GetReviewShowPageQuery {
  constructor(protected execCtx: ReviewActionContext) {}

  async execute(reviewSessionId: string): Promise<GetReviewShowPageResult> {
    const [session, skills] = await Promise.all([
      new GetReviewSessionQuery(this.execCtx).handle(new GetReviewSessionDTO(reviewSessionId)),
      skillPublicApi.listActive(),
    ])

    let disputeId: string | null = null
    if (session.status === 'disputed') {
      const dispute = (await db
        .from('review_disputes')
        .where('review_session_id', reviewSessionId)
        .select('id')
        .first()) as { id: string } | null
      if (dispute) {
        disputeId = dispute.id
      }
    }

    return {
      session,
      skills,
      proficiencyLevels: proficiencyLevelOptions,
      disputeId,
    }
  }
}

