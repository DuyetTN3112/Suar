import db from '@adonisjs/lucid/services/db'

import GetReviewSessionQuery from './get_review_session_query.js'

import { GetReviewSessionDTO } from '#modules/reviews/actions/dtos/request/review_dtos'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import {
  loadReviewRelatedTaskComments,
  type ReviewRelatedTaskComment,
} from '#modules/reviews/actions/support/review_related_task_comments'
import { CANONICAL_PROFICIENCY_LEVEL_OPTIONS } from '#modules/skills/constants/proficiency_level_constants'
import { skillPublicApi } from '#modules/skills/public_contracts/skill_public_api'

export interface GetReviewShowPageResult {
  session: Awaited<ReturnType<GetReviewSessionQuery['handle']>>
  skills: Awaited<ReturnType<typeof skillPublicApi.listActive>>
  proficiencyLevels: typeof CANONICAL_PROFICIENCY_LEVEL_OPTIONS
  disputeId: string | null
  taskComments: ReviewRelatedTaskComment[]
}

interface ReviewSessionTaskShape {
  task_assignment?: {
    task?: {
      id?: string | null
    }
  }
}

interface ReviewDisputeRow {
  id: string
}

function readReviewTaskId(session: unknown): string | null {
  if (typeof session !== 'object' || session === null) {
    return null
  }

  const maybeTaskAssignment = (session as ReviewSessionTaskShape).task_assignment
  const taskId = maybeTaskAssignment?.task?.id
  return typeof taskId === 'string' && taskId.length > 0 ? taskId : null
}

export default class GetReviewShowPageQuery {
  constructor(protected execCtx: ReviewActionContext) {}

  async execute(reviewSessionId: string): Promise<GetReviewShowPageResult> {
    const [session, skills] = await Promise.all([
      new GetReviewSessionQuery(this.execCtx).handle(new GetReviewSessionDTO(reviewSessionId)),
      skillPublicApi.listActive(),
    ])

    const taskId = readReviewTaskId(session)

    const [taskComments, dispute] = await Promise.all([
      loadReviewRelatedTaskComments(taskId, undefined, {
        scope: 'all',
      }),
      session.status === 'disputed'
        ? (db
            .from('review_disputes')
            .where('review_session_id', reviewSessionId)
            .select('id')
            .first() as Promise<ReviewDisputeRow | null>)
        : Promise.resolve(null),
    ])

    let disputeId: string | null = null
    if (dispute && typeof dispute.id === 'string') {
      disputeId = dispute.id
    }

    return {
      session,
      skills,
      proficiencyLevels: CANONICAL_PROFICIENCY_LEVEL_OPTIONS,
      disputeId,
      taskComments,
    }
  }
}
