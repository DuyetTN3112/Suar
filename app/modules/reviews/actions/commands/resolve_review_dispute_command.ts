import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import type { ReviewDisputeResult } from '#modules/reviews/actions/commands/create_review_dispute_command'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import {
  VALID_PROFILE_UPDATE_ACTIONS,
  VALID_REVIEWER_CREDIBILITY_ACTIONS,
} from '#modules/reviews/constants/review_constants'
import { canResolveReviewDispute } from '#modules/reviews/domain/review_dispute_rules'

export interface ResolveReviewDisputeDTO {
  dispute_id: string
  final_decision:
    | 'uphold_review'
    | 'adjust_score'
    | 'request_re_review'
    | 'dismiss_dispute'
    | 'partially_accept'
  final_rationale: string
  profile_update_action?: string | null
  reviewer_credibility_action?: string | null
}

function requireUserId(ctx: ReviewActionContext): string {
  if (!ctx.userId) {
    throw new UnauthorizedException()
  }

  return ctx.userId
}

export default class ResolveReviewDisputeCommand {
  constructor(private execCtx: ReviewActionContext) {}

  async execute(dto: ResolveReviewDisputeDTO): Promise<ReviewDisputeResult> {
    const actorId = requireUserId(this.execCtx)
    const trx = await db.transaction()

    try {
      const actor = (await trx.from('users').where('id', actorId).select('system_role').first()) as
        | { system_role: string }
        | undefined
      if (!actor) {
        throw new NotFoundException('User not found')
      }

      const dispute = (await trx
        .from('review_disputes')
        .where('id', dto.dispute_id)
        .forUpdate()
        .first()) as
        | {
            status: string
            review_session_id: string
          }
        | undefined

      if (!dispute) {
        throw new NotFoundException('Review dispute not found')
      }

      const policyResult = canResolveReviewDispute({
        actorSystemRole: actor.system_role,
        disputeStatus: dispute.status,
        finalDecision: dto.final_decision,
        finalRationale: dto.final_rationale,
      })

      if (!policyResult.allowed) {
        if (policyResult.code === 'FORBIDDEN') {
          throw new ForbiddenException(policyResult.reason)
        }
        throw new BusinessLogicException(policyResult.reason)
      }

      // Validate typed actions
      if (dto.profile_update_action && !VALID_PROFILE_UPDATE_ACTIONS.has(dto.profile_update_action)) {
        throw new BusinessLogicException(`Invalid profile_update_action: ${dto.profile_update_action}`)
      }
      if (dto.reviewer_credibility_action && !VALID_REVIEWER_CREDIBILITY_ACTIONS.has(dto.reviewer_credibility_action)) {
        throw new BusinessLogicException(`Invalid reviewer_credibility_action: ${dto.reviewer_credibility_action}`)
      }

      const [resolved] = (await trx
        .from('review_disputes')
        .where('id', dto.dispute_id)
        .update({
          status: 'resolved',
          resolved_at: db.raw('NOW()'),
          resolved_by: actorId,
          final_decision: dto.final_decision,
          final_rationale: dto.final_rationale.trim(),
          profile_update_action: dto.profile_update_action ?? null,
          reviewer_credibility_action: dto.reviewer_credibility_action ?? null,
        })
        .returning('*')) as Record<string, unknown>[]

      const resolvedResult = resolved as unknown as ReviewDisputeResult

      const reviewers = (await trx
        .from('skill_reviews')
        .where('review_session_id', dispute.review_session_id)
        .select('reviewer_id')) as { reviewer_id: string }[]
      const reviewerIds = Array.from(new Set(reviewers.map((r) => r.reviewer_id)))

      await trx.commit()

      if (this.execCtx.userId) {
        await auditPublicApi.write(this.execCtx, {
          user_id: this.execCtx.userId,
          action: 'resolve_review_dispute',
          entity_type: 'review_dispute',
          entity_id: dto.dispute_id,
          old_values: null,
          new_values: {
            final_decision: dto.final_decision,
            profile_update_action: dto.profile_update_action ?? null,
            reviewer_credibility_action: dto.reviewer_credibility_action ?? null,
          },
        })
      }

      await emitter.emit('dispute:resolved', {
        disputeId: resolvedResult.id,
        reviewSessionId: resolvedResult.review_session_id,
        revieweeId: resolvedResult.reviewee_id,
        reviewerIds,
        resolvedBy: actorId,
        finalDecision: dto.final_decision,
        profileUpdateAction: dto.profile_update_action,
        reviewerCredibilityAction: dto.reviewer_credibility_action,
      })

      return resolvedResult
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }
}
