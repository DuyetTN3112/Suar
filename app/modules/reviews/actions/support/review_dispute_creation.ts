import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'

import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import {
  ReviewConfirmationAction,
  ReviewDisputeStatus,
  ReviewSessionStatus,
} from '#modules/reviews/constants/review_constants'
import {
  canOpenReviewDispute,
  isActiveReviewDisputeStatus,
} from '#modules/reviews/domain/review_dispute_rules'
import type { ReviewConfirmationEntry } from '#modules/reviews/types/review_confirmation_entry'

export interface CreateReviewDisputeRecordInput {
  trx: TransactionClientContract
  actorId: string
  reviewSessionId: string
  disputeReason: string
  requestedOutcome: 'adjust_score' | 'remove_review' | 'request_re_review' | 'add_context' | 'other'
  disputedDimensions?: Record<string, unknown> | null
  disputedSkillReviews?: Record<string, unknown>[] | null
  appendDisputedConfirmation?: boolean
}

export interface CreatedReviewDisputeRecord {
  dispute: Record<string, unknown>
  session: {
    id: string
    task_assignment_id: string
    reviewee_id: string
    status: string
    completed_at: Date | string | null
    confirmations: string | unknown[] | null
  }
  assignment: {
    id: string
    task_id: string
  }
  confirmation: ReviewConfirmationEntry | null
}

export async function createReviewDisputeRecord(
  input: CreateReviewDisputeRecordInput
): Promise<CreatedReviewDisputeRecord> {
  const disputedAction: ReviewConfirmationEntry['action'] = ReviewConfirmationAction.DISPUTED
  const session = (await input.trx
    .from('review_sessions')
    .where('id', input.reviewSessionId)
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

  const assignment = (await input.trx
    .from('task_assignments')
    .where('id', session.task_assignment_id)
    .first()) as { id: string; task_id: string } | undefined

  if (!assignment) {
    throw new NotFoundException('Task assignment not found')
  }

  const existingDisputes = (await input.trx
    .from('review_disputes')
    .where('review_session_id', input.reviewSessionId)
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
    actorId: input.actorId,
    revieweeId: session.reviewee_id,
    reviewSessionStatus: session.status,
    hasActiveDispute,
    disputeReason: input.disputeReason,
    daysSinceCompleted,
  })

  if (!policyResult.allowed) {
    if (policyResult.code === 'FORBIDDEN') {
      throw new ForbiddenException(policyResult.reason)
    }
    throw new BusinessLogicException(policyResult.reason)
  }

  const [created] = (await input.trx
    .table('review_disputes')
    .insert({
      review_session_id: session.id,
      task_assignment_id: assignment.id,
      task_id: assignment.task_id,
      reviewee_id: session.reviewee_id,
      opened_by: input.actorId,
      status: ReviewDisputeStatus.PENDING,
      dispute_reason: input.disputeReason.trim(),
      disputed_dimensions: JSON.stringify(input.disputedDimensions ?? {}),
      disputed_skill_reviews: JSON.stringify(input.disputedSkillReviews ?? []),
      requested_outcome: input.requestedOutcome,
    })
    .returning('*')) as [Record<string, unknown>]

  const rawConfirmations = session.confirmations
  const confirmations = (
    typeof rawConfirmations === 'string'
      ? JSON.parse(rawConfirmations)
      : (rawConfirmations ?? [])
  ) as ReviewConfirmationEntry[]

  let confirmation: ReviewConfirmationEntry | null = null
  if (input.appendDisputedConfirmation !== false) {
    confirmation =
      confirmations.find(
        (entry) => entry.user_id === input.actorId && entry.action === disputedAction
      ) ?? null

    if (!confirmation) {
      confirmation = {
        user_id: input.actorId,
        action: disputedAction,
        dispute_reason: input.disputeReason.trim(),
        created_at: DateTime.now().toISO(),
      }
      confirmations.push(confirmation)
    }
  }

  await input.trx
    .from('review_sessions')
    .where('id', session.id)
    .update({
      status: ReviewSessionStatus.DISPUTED,
      confirmations: JSON.stringify(confirmations),
      updated_at: input.trx.raw('NOW()'),
    })

  return {
    dispute: created,
    session,
    assignment,
    confirmation,
  }
}
