import db from '@adonisjs/lucid/services/db'

import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import {
  loadReviewDisputeAccessContext,
  loadReviewDisputeEvidences,
} from '#modules/reviews/actions/commands/review_dispute_access'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'

export interface ListReviewDisputeEvidencesDTO {
  dispute_id: string
}

function requireUserId(ctx: ReviewActionContext): string {
  if (!ctx.userId) {
    throw new UnauthorizedException()
  }

  return ctx.userId
}

export default class ListReviewDisputeEvidencesQuery {
  constructor(private execCtx: ReviewActionContext) {}

  async execute(dto: ListReviewDisputeEvidencesDTO): Promise<Record<string, unknown>[]> {
    const actorId = requireUserId(this.execCtx)
    const trx = await db.transaction()

    try {
      const access = await loadReviewDisputeAccessContext(trx, dto.dispute_id, actorId)
      if (!access.isParticipant) {
        throw new ForbiddenException('Only dispute participants can view evidences')
      }

      const evidences = await loadReviewDisputeEvidences(trx, dto.dispute_id)
      await trx.commit()
      return evidences
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }
}
