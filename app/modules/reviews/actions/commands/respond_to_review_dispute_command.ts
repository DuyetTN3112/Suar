import db from '@adonisjs/lucid/services/db'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import { PLATFORM_EVENT_NAMES } from '#modules/observability/contracts/platform_event_names'
import {
  platformOperationalLogger,
  platformWorkflowLogger,
} from '#modules/observability/public_contracts/platform_observability'
import {
  loadReviewDisputeAccessContext,
  type ReviewDisputeAuthorContext,
} from '#modules/reviews/actions/commands/review_dispute_access'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { ReviewDisputeStatus } from '#modules/reviews/constants/review_constants'
import { canRespondToReviewDispute } from '#modules/reviews/domain/review_dispute_rules'
import { buildReviewDisputeEvent } from '#modules/reviews/observability/review_event_factory'

export interface RespondToReviewDisputeDTO {
  dispute_id: string
  body: string
  visibility?: 'all_parties' | 'admin_only'
}

export interface ReviewDisputeResponseResult {
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

export default class RespondToReviewDisputeCommand {
  constructor(private execCtx: ReviewActionContext) {}

  async execute(dto: RespondToReviewDisputeDTO): Promise<ReviewDisputeResponseResult> {
    const actorId = requireUserId(this.execCtx)
    const startedAt = Date.now()
    platformOperationalLogger.log(
      'info',
      buildReviewDisputeEvent(this.execCtx, {
        eventName: PLATFORM_EVENT_NAMES.REVIEW_DISPUTE_RESPONSE_CREATED,
        eventFamily: 'dispute',
        subsystem: 'review_dispute_comments',
        workflow: 'review_dispute_respond',
        stage: 'started',
        outcome: 'success',
        disputeId: dto.dispute_id,
        change: {
          visibility: dto.visibility ?? 'all_parties',
        },
        retentionClass: 'transient_runtime',
      })
    )
    const trx = await db.transaction()

    try {
      const access = await loadReviewDisputeAccessContext(trx, dto.dispute_id, actorId)
      const policyResult = canRespondToReviewDispute({
        disputeStatus: access.dispute.status,
        body: dto.body,
        canRespond: access.canRespond,
      })

      if (!policyResult.allowed) {
        if (policyResult.code === 'FORBIDDEN') {
          throw new ForbiddenException(policyResult.reason)
        }
        throw new BusinessLogicException(policyResult.reason)
      }

      if (!access.authorContext) {
        throw new ForbiddenException('Review dispute responder context is required')
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
      const nextDisputeStatus =
        access.dispute.status === 'pending'
          ? ReviewDisputeStatus.COLLECTING_EVIDENCE
          : access.dispute.status

      if (access.dispute.status === 'pending') {
        await trx.from('review_disputes').where('id', dto.dispute_id).update({
          status: ReviewDisputeStatus.COLLECTING_EVIDENCE,
          updated_at: db.raw('NOW()'),
        })
      }

      await trx.commit()

      if (this.execCtx.userId) {
        await auditPublicApi.write(this.execCtx, {
          user_id: this.execCtx.userId,
          action: 'respond_to_review_dispute',
          entity_type: 'review_dispute',
          entity_id: dto.dispute_id,
          old_values: null,
          new_values: {
            comment_id: created['id'],
            visibility: created['visibility'],
            dispute_status: nextDisputeStatus,
          },
        })
      }

      await platformWorkflowLogger.checkpointSafely(
        this.execCtx,
        buildReviewDisputeEvent(this.execCtx, {
          eventName: PLATFORM_EVENT_NAMES.REVIEW_DISPUTE_RESPONSE_CREATED,
          eventFamily: 'dispute',
          subsystem: 'review_dispute_comments',
          workflow: 'review_dispute_respond',
          stage: 'completed',
          outcome: 'success',
          disputeId: dto.dispute_id,
          reviewSessionId: access.dispute.review_session_id,
          taskAssignmentId: access.dispute.task_assignment_id,
          taskId: access.dispute.task_id,
          revieweeId: access.dispute.reviewee_id,
          change: {
            comment_id: created['id'],
            visibility: created['visibility'],
            dispute_status: nextDisputeStatus,
          },
          runtime: {
            duration_ms: Date.now() - startedAt,
          },
        })
      )

      return {
        ...(created as unknown as Omit<ReviewDisputeResponseResult, 'author_context'>),
        author_context: access.authorContext,
      }
    } catch (error) {
      await trx.rollback()
      await platformWorkflowLogger.checkpointSafely(
        this.execCtx,
        buildReviewDisputeEvent(this.execCtx, {
          eventName: PLATFORM_EVENT_NAMES.REVIEW_DISPUTE_RESPONSE_FAILED,
          eventFamily: 'dispute',
          subsystem: 'review_dispute_comments',
          workflow: 'review_dispute_respond',
          stage: 'failed',
          outcome: 'failure',
          disputeId: dto.dispute_id,
          change: {
            visibility: dto.visibility ?? 'all_parties',
          },
          runtime: {
            duration_ms: Date.now() - startedAt,
          },
          error,
        })
      )
      throw error
    }
  }
}
