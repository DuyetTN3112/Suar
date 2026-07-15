import type {
  DisputeResolvedReceiptStore,
  ReviewConfirmedReceiptStore,
  ReviewEventSourceReader,
  ReviewProjectionLock,
  ReviewSubmittedReceiptStore,
} from '#modules/reviews/actions/ports/outbound/review_event_processing'
import type { ReviewTransaction } from '#modules/reviews/actions/ports/outbound/review_transaction'
import { toLucidReviewTransaction } from '#modules/reviews/infra/adapters/review-core/lucid_review_transaction_runner'
import { disputeResolvedProcessingReceiptRepository } from '#modules/reviews/infra/repositories/disputes/dispute_resolved_processing_receipt_repository'
import { reviewConfirmedProcessingReceiptRepository } from '#modules/reviews/infra/repositories/disputes/review_confirmed_processing_receipt_repository'
import { reviewSubmittedProcessingReceiptRepository } from '#modules/reviews/infra/repositories/review-submission/review_submitted_processing_receipt_repository'
import { lockReviewConfirmedProjection } from '#modules/reviews/infra/repositories/write/review_confirmed_projection_lock'

interface SubmittedAssignmentRow {
  review_session_id: string
  reviewer_id: string
  reviewer_type: string
  status: string
  submitted_at: Date | string | null
  reviewee_id: string
  task_id: string
}

interface ResolvedDisputeRow {
  status: string
  review_session_id: string
  reviewee_id: string
  resolved_by: string | null
  final_decision: string | null
  profile_update_action: string | null
  reviewer_credibility_action: string | null
}

export class LucidReviewSubmittedReceiptStore implements ReviewSubmittedReceiptStore {
  claimOrLoad(
    transaction: ReviewTransaction,
    payload: Parameters<ReviewSubmittedReceiptStore['claimOrLoad']>[1]
  ) {
    return reviewSubmittedProcessingReceiptRepository.claimOrLoad(
      toLucidReviewTransaction(transaction),
      payload
    )
  }

  complete(
    transaction: ReviewTransaction,
    submissionId: string,
    flaggedReviewCount: number,
    talentProjection: Parameters<ReviewSubmittedReceiptStore['complete']>[3]
  ) {
    return reviewSubmittedProcessingReceiptRepository.complete(
      toLucidReviewTransaction(transaction),
      submissionId,
      flaggedReviewCount,
      talentProjection
    )
  }
}

export class LucidReviewConfirmedReceiptStore implements ReviewConfirmedReceiptStore {
  claimOrLoadDatabaseApplied(
    transaction: ReviewTransaction,
    input: Parameters<ReviewConfirmedReceiptStore['claimOrLoadDatabaseApplied']>[1]
  ) {
    return reviewConfirmedProcessingReceiptRepository.claimOrLoadDatabaseApplied(
      toLucidReviewTransaction(transaction),
      input
    )
  }

  saveExternalEffects(
    transaction: ReviewTransaction,
    confirmationId: string,
    effects: Parameters<ReviewConfirmedReceiptStore['saveExternalEffects']>[2]
  ) {
    return reviewConfirmedProcessingReceiptRepository.saveExternalEffects(
      toLucidReviewTransaction(transaction),
      confirmationId,
      effects
    )
  }

  advanceExternalEffectCursor(
    input: Parameters<ReviewConfirmedReceiptStore['advanceExternalEffectCursor']>[0]
  ) {
    return reviewConfirmedProcessingReceiptRepository.advanceExternalEffectCursor(input)
  }

  recordExternalFailure(confirmationId: string, errorCode: string) {
    return reviewConfirmedProcessingReceiptRepository.recordExternalFailure(
      confirmationId,
      errorCode
    )
  }
}

export class LucidDisputeResolvedReceiptStore implements DisputeResolvedReceiptStore {
  claimOrLoadDatabaseApplied(
    transaction: ReviewTransaction,
    payload: Parameters<DisputeResolvedReceiptStore['claimOrLoadDatabaseApplied']>[1]
  ) {
    return disputeResolvedProcessingReceiptRepository.claimOrLoadDatabaseApplied(
      toLucidReviewTransaction(transaction),
      payload
    )
  }

  saveExternalEffects(
    transaction: ReviewTransaction,
    disputeId: string,
    effects: Parameters<DisputeResolvedReceiptStore['saveExternalEffects']>[2]
  ) {
    return disputeResolvedProcessingReceiptRepository.saveExternalEffects(
      toLucidReviewTransaction(transaction),
      disputeId,
      effects
    )
  }

  advanceExternalEffectCursor(
    input: Parameters<DisputeResolvedReceiptStore['advanceExternalEffectCursor']>[0]
  ) {
    return disputeResolvedProcessingReceiptRepository.advanceExternalEffectCursor(input)
  }

  recordExternalFailure(disputeId: string, errorCode: string) {
    return disputeResolvedProcessingReceiptRepository.recordExternalFailure(disputeId, errorCode)
  }
}

export class LucidReviewEventSourceReader implements ReviewEventSourceReader {
  async findSubmittedAssignment(reviewerAssignmentId: string, transaction: ReviewTransaction) {
    const row = (await toLucidReviewTransaction(transaction)
      .from('review_session_reviewer_assignments as assignment')
      .join('review_sessions as session', 'session.id', 'assignment.review_session_id')
      .join(
        'task_assignments as task_assignment',
        'task_assignment.id',
        'session.task_assignment_id'
      )
      .where('assignment.id', reviewerAssignmentId)
      .select(
        'assignment.review_session_id',
        'assignment.reviewer_id',
        'assignment.reviewer_type',
        'assignment.status',
        'assignment.submitted_at',
        'session.reviewee_id',
        'task_assignment.task_id'
      )
      .forUpdate('assignment')
      .first()) as SubmittedAssignmentRow | undefined

    if (!row) return null
    return {
      reviewSessionId: row.review_session_id,
      reviewerId: row.reviewer_id,
      reviewerType: row.reviewer_type,
      status: row.status,
      submittedAt: row.submitted_at,
      revieweeId: row.reviewee_id,
      taskId: row.task_id,
    }
  }

  async findResolvedDispute(
    disputeId: string,
    reviewSessionId: string,
    transaction: ReviewTransaction
  ) {
    const trx = toLucidReviewTransaction(transaction)
    const dispute = (await trx
      .from('review_disputes')
      .where('id', disputeId)
      .first()) as ResolvedDisputeRow | undefined
    if (!dispute) return null
    const reviewers = (await trx
      .from('skill_reviews')
      .where('review_session_id', reviewSessionId)
      .select('reviewer_id')) as { reviewer_id: string }[]

    return {
      status: dispute.status,
      reviewSessionId: dispute.review_session_id,
      revieweeId: dispute.reviewee_id,
      resolvedBy: dispute.resolved_by,
      finalDecision: dispute.final_decision,
      profileUpdateAction: dispute.profile_update_action,
      reviewerCredibilityAction: dispute.reviewer_credibility_action,
      reviewerIds: [...new Set(reviewers.map((row) => row.reviewer_id))].sort(),
    }
  }
}

export class LucidReviewProjectionLock implements ReviewProjectionLock {
  acquire(revieweeId: string, transaction: ReviewTransaction): Promise<void> {
    return lockReviewConfirmedProjection(revieweeId, toLucidReviewTransaction(transaction))
  }
}
