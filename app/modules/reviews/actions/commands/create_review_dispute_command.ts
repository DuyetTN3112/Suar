import db from '@adonisjs/lucid/services/db'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import { PLATFORM_EVENT_NAMES } from '#modules/observability/contracts/platform_event_names'
import {
  platformOperationalLogger,
  platformWorkflowLogger,
} from '#modules/observability/public_contracts/platform_observability'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { createReviewDisputeRecord } from '#modules/reviews/actions/support/review_dispute_creation'
import { buildReviewDisputeEvent } from '#modules/reviews/observability/review_event_factory'

export interface CreateReviewDisputeDTO {
  review_session_id: string
  dispute_reason: string
  disputed_dimensions?: Record<string, unknown> | null
  disputed_skill_reviews?: Record<string, unknown>[] | null
  requested_outcome: 'adjust_score' | 'remove_review' | 'request_re_review' | 'add_context' | 'other'
}

export interface ReviewDisputeResult {
  id: string
  review_session_id: string
  task_assignment_id: string
  task_id: string
  reviewee_id: string
  opened_by: string
  status: string
  dispute_reason: string
  requested_outcome: string
  resolved_by: string | null
  final_decision: string | null
  final_rationale: string | null
}

function requireUserId(ctx: ReviewActionContext): string {
  if (!ctx.userId) {
    throw new UnauthorizedException()
  }

  return ctx.userId
}

function toResult(row: Record<string, unknown>): ReviewDisputeResult {
  return row as unknown as ReviewDisputeResult
}

export default class CreateReviewDisputeCommand {
  constructor(private execCtx: ReviewActionContext) {}

  async execute(dto: CreateReviewDisputeDTO): Promise<ReviewDisputeResult> {
    const actorId = requireUserId(this.execCtx)
    const startedAt = Date.now()
    platformOperationalLogger.log(
      'info',
      buildReviewDisputeEvent(this.execCtx, {
        eventName: PLATFORM_EVENT_NAMES.REVIEW_DISPUTE_CREATED,
        eventFamily: 'dispute',
        subsystem: 'review_disputes',
        workflow: 'review_dispute_create',
        stage: 'started',
        outcome: 'success',
        disputeId: null,
        reviewSessionId: dto.review_session_id,
        change: {
          requested_outcome: dto.requested_outcome,
        },
        retentionClass: 'transient_runtime',
      })
    )
    const trx = await db.transaction()

    try {
      const { dispute: created, session, assignment } = await createReviewDisputeRecord({
        trx,
        actorId,
        reviewSessionId: dto.review_session_id,
        disputeReason: dto.dispute_reason,
        requestedOutcome: dto.requested_outcome,
        ...(dto.disputed_dimensions !== undefined
          ? { disputedDimensions: dto.disputed_dimensions }
          : {}),
        ...(dto.disputed_skill_reviews !== undefined
          ? { disputedSkillReviews: dto.disputed_skill_reviews }
          : {}),
      })

      await trx.commit()
      await cacheStore.deleteByPattern(`task:detail:${assignment.task_id}*`)

      if (this.execCtx.userId) {
        await auditPublicApi.write(this.execCtx, {
          user_id: this.execCtx.userId,
          action: 'create_review_dispute',
          entity_type: 'review_dispute',
          entity_id: created['id'] as string,
          old_values: null,
          new_values: {
            review_session_id: session.id,
            task_assignment_id: assignment.id,
            requested_outcome: dto.requested_outcome,
          },
        })
      }

      await platformWorkflowLogger.checkpointSafely(
        this.execCtx,
        buildReviewDisputeEvent(this.execCtx, {
          eventName: PLATFORM_EVENT_NAMES.REVIEW_DISPUTE_CREATED,
          eventFamily: 'dispute',
          subsystem: 'review_disputes',
          workflow: 'review_dispute_create',
          stage: 'completed',
          outcome: 'success',
          disputeId: created['id'] as string,
          reviewSessionId: session.id,
          taskAssignmentId: assignment.id,
          taskId: assignment.task_id,
          revieweeId: session.reviewee_id,
          change: {
            requested_outcome: dto.requested_outcome,
          },
          runtime: {
            duration_ms: Date.now() - startedAt,
          },
        })
      )

      return toResult(created)
    } catch (error) {
      await trx.rollback()
      await platformWorkflowLogger.checkpointSafely(
        this.execCtx,
        buildReviewDisputeEvent(this.execCtx, {
          eventName: PLATFORM_EVENT_NAMES.REVIEW_DISPUTE_CREATION_FAILED,
          eventFamily: 'dispute',
          subsystem: 'review_disputes',
          workflow: 'review_dispute_create',
          stage: 'failed',
          outcome: 'failure',
          disputeId: null,
          reviewSessionId: dto.review_session_id,
          change: {
            requested_outcome: dto.requested_outcome,
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
