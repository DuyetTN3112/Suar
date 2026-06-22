import db from '@adonisjs/lucid/services/db'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import {
  loadReviewDisputeAccessContext,
  type ReviewDisputeAuthorContext,
} from '#modules/reviews/actions/commands/review_dispute_access'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { canCommentOnReviewDispute } from '#modules/reviews/domain/review_dispute_rules'

export interface CreateReviewDisputeCommentDTO {
  dispute_id: string
  body: string
  visibility?: 'all_parties' | 'admin_only'
}

export interface ReviewDisputeCommentResult {
  id: string
  dispute_id: string
  author_id: string
  author_context: ReviewDisputeAuthorContext
  body: string
  visibility: 'all_parties' | 'admin_only'
}

function requireUserId(ctx: ReviewActionContext): string {
  if (!ctx.userId) {
    throw new UnauthorizedException()
  }

  return ctx.userId
}

export default class CreateReviewDisputeCommentCommand {
  constructor(private execCtx: ReviewActionContext) {}

  async execute(dto: CreateReviewDisputeCommentDTO): Promise<ReviewDisputeCommentResult> {
    const actorId = requireUserId(this.execCtx)
    const trx = await db.transaction()

    try {
      const access = await loadReviewDisputeAccessContext(trx, dto.dispute_id, actorId)
      const policyResult = canCommentOnReviewDispute({
        disputeStatus: access.dispute.status,
        body: dto.body,
        isParticipant: access.isParticipant,
      })

      if (!policyResult.allowed) {
        if (policyResult.code === 'FORBIDDEN') {
          throw new ForbiddenException(policyResult.reason)
        }
        throw new BusinessLogicException(policyResult.reason)
      }

      if (!access.authorContext) {
        throw new ForbiddenException('Review dispute participant context is required')
      }

      const [created] = (await trx
        .table('review_dispute_comments')
        .insert({
          dispute_id: dto.dispute_id,
          author_id: actorId,
          body: dto.body.trim(),
          visibility: dto.visibility ?? 'all_parties',
        })
        .returning('*')) as [Record<string, unknown>]

      await trx.commit()

      if (this.execCtx.userId) {
        await auditPublicApi.write(this.execCtx, {
          user_id: this.execCtx.userId,
          action: 'create_review_dispute_comment',
          entity_type: 'review_dispute',
          entity_id: dto.dispute_id,
          old_values: null,
          new_values: {
            comment_id: created.id,
            visibility: created.visibility,
          },
        })
      }

      return {
        ...(created as unknown as Omit<ReviewDisputeCommentResult, 'author_context'>),
        author_context: access.authorContext,
      }
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }
}
