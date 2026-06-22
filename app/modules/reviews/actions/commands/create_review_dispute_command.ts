import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import {
  canOpenReviewDispute,
  isActiveReviewDisputeStatus,
} from '#modules/reviews/domain/review_dispute_rules'

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
    const trx = await db.transaction()

    try {
      const session = (await trx
        .from('review_sessions')
        .where('id', dto.review_session_id)
        .forUpdate()
        .first()) as
        | {
            id: string
            task_assignment_id: string
            reviewee_id: string
            status: string
            completed_at: Date | string | null
            confirmations: string | unknown[] | null
          }
        | undefined

      if (!session) {
        throw new NotFoundException('Review session not found')
      }

      const assignment = (await trx
        .from('task_assignments')
        .where('id', session.task_assignment_id)
        .first()) as { id: string; task_id: string } | undefined

      if (!assignment) {
        throw new NotFoundException('Task assignment not found')
      }

      const existingDisputes = (await trx
        .from('review_disputes')
        .where('review_session_id', dto.review_session_id)
        .select('status')) as { status: string }[]

      const hasActiveDispute = existingDisputes.some((dispute) =>
        isActiveReviewDisputeStatus(dispute.status)
      )

      const completedAt =
        session.completed_at instanceof Date
          ? DateTime.fromJSDate(session.completed_at)
          : typeof session.completed_at === 'string'
            ? DateTime.fromISO(session.completed_at)
            : null
      const daysSinceCompleted = completedAt
        ? Math.floor(DateTime.now().diff(completedAt, 'days').days)
        : null

      const policyResult = canOpenReviewDispute({
        actorId,
        revieweeId: session.reviewee_id,
        reviewSessionStatus: session.status,
        hasActiveDispute,
        disputeReason: dto.dispute_reason,
        daysSinceCompleted,
      })

      if (!policyResult.allowed) {
        if (policyResult.code === 'FORBIDDEN') {
          throw new ForbiddenException(policyResult.reason)
        }
        throw new BusinessLogicException(policyResult.reason)
      }

      const [created] = (await trx
        .table('review_disputes')
        .insert({
          review_session_id: session.id,
          task_assignment_id: assignment.id,
          task_id: assignment.task_id,
          reviewee_id: session.reviewee_id,
          opened_by: actorId,
          status: 'pending',
          dispute_reason: dto.dispute_reason.trim(),
          disputed_dimensions: JSON.stringify(dto.disputed_dimensions ?? {}),
          disputed_skill_reviews: JSON.stringify(dto.disputed_skill_reviews ?? []),
          requested_outcome: dto.requested_outcome,
        })
        .returning('*')) as [Record<string, unknown>]

      const rawConfirmations = session.confirmations
      const confirmations = (
        typeof rawConfirmations === 'string'
          ? JSON.parse(rawConfirmations)
          : (rawConfirmations ?? [])
      ) as { user_id: string; action: string; dispute_reason?: string; created_at?: string }[]

      if (!confirmations.some((c) => c.action === 'disputed')) {
        confirmations.push({
          user_id: actorId,
          action: 'disputed',
          dispute_reason: dto.dispute_reason.trim(),
          created_at: DateTime.now().toISO(),
        })
      }

      await trx
        .from('review_sessions')
        .where('id', session.id)
        .update({
          status: 'disputed',
          confirmations: JSON.stringify(confirmations),
        })

      await trx.commit()

      if (this.execCtx.userId) {
        await auditPublicApi.write(this.execCtx, {
          user_id: this.execCtx.userId,
          action: 'create_review_dispute',
          entity_type: 'review_dispute',
          entity_id: created.id as string,
          old_values: null,
          new_values: {
            review_session_id: session.id,
            task_assignment_id: assignment.id,
            requested_outcome: dto.requested_outcome,
          },
        })
      }

      return toResult(created)
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }
}
