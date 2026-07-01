import type {
  DisputeResolvedOutboxPayload,
  ReviewConfirmedAccomplishmentProjectionIdentity,
  ReviewSubmittedOutboxPayload,
} from '#modules/events/public_contracts/domain_event_outbox'
import type {
  ReviewTransaction,
  ReviewTransactionRunner,
} from '#modules/reviews/actions/ports/outbound/review_transaction'
import type {
  AdvanceDisputeResolvedExternalEffectInput,
  AdvanceDisputeResolvedExternalEffectResult,
  ClaimDisputeResolvedReceiptResult,
  DisputeResolvedProcessingReceipt,
} from '#modules/reviews/public_contracts/dispute_resolved_processing_receipt'
import type {
  AdvanceReviewConfirmedExternalEffectInput,
  AdvanceReviewConfirmedExternalEffectResult,
  ClaimReviewConfirmedReceiptInput,
  ClaimReviewConfirmedReceiptResult,
  ReviewConfirmedExternalEffects,
  ReviewConfirmedProcessingReceipt,
} from '#modules/reviews/public_contracts/review_confirmed_processing_receipt'
import type { TalentExplainabilityProjectionChangedV1 } from '#modules/reviews/public_contracts/talent_explainability_projection_v1'

export interface ReviewSubmittedProcessingReceipt {
  submissionId: string
  payloadFingerprint: string
  eventVersion: 1
  payload: ReviewSubmittedOutboxPayload
  ruleVersion: 1
  flaggedReviewCount: number | null
  talentProjection: TalentExplainabilityProjectionChangedV1 | null
  completedAt: Date | null
}

export interface ClaimReviewSubmittedReceiptResult {
  inserted: boolean
  receipt: ReviewSubmittedProcessingReceipt
}

export interface ReviewSubmittedReceiptStore {
  claimOrLoad(
    transaction: ReviewTransaction,
    payload: ReviewSubmittedOutboxPayload
  ): Promise<ClaimReviewSubmittedReceiptResult>
  complete(
    transaction: ReviewTransaction,
    submissionId: string,
    flaggedReviewCount: number,
    talentProjection: TalentExplainabilityProjectionChangedV1
  ): Promise<ReviewSubmittedProcessingReceipt>
}

export interface ReviewConfirmedReceiptStore {
  claimOrLoadDatabaseApplied(
    transaction: ReviewTransaction,
    input: ClaimReviewConfirmedReceiptInput
  ): Promise<ClaimReviewConfirmedReceiptResult>
  saveExternalEffects(
    transaction: ReviewTransaction,
    confirmationId: string,
    effects: ReviewConfirmedExternalEffects
  ): Promise<ReviewConfirmedProcessingReceipt>
  advanceExternalEffectCursor(
    input: AdvanceReviewConfirmedExternalEffectInput
  ): Promise<AdvanceReviewConfirmedExternalEffectResult>
  recordExternalFailure(
    confirmationId: string,
    errorCode: string
  ): Promise<ReviewConfirmedProcessingReceipt>
}

export interface DisputeResolvedReceiptStore {
  claimOrLoadDatabaseApplied(
    transaction: ReviewTransaction,
    payload: DisputeResolvedOutboxPayload
  ): Promise<ClaimDisputeResolvedReceiptResult>
  saveExternalEffects(
    transaction: ReviewTransaction,
    disputeId: string,
    effects: ReviewConfirmedExternalEffects
  ): Promise<DisputeResolvedProcessingReceipt>
  advanceExternalEffectCursor(
    input: AdvanceDisputeResolvedExternalEffectInput
  ): Promise<AdvanceDisputeResolvedExternalEffectResult>
  recordExternalFailure(
    disputeId: string,
    errorCode: string
  ): Promise<DisputeResolvedProcessingReceipt>
}

export interface ReviewSubmittedAuthoritativeAssignment {
  reviewSessionId: string
  reviewerId: string
  reviewerType: string
  status: string
  submittedAt: Date | string | null
  revieweeId: string
  taskId: string
}

export interface DisputeResolvedAuthoritativeSource {
  status: string
  reviewSessionId: string
  revieweeId: string
  resolvedBy: string | null
  finalDecision: string | null
  profileUpdateAction: string | null
  reviewerCredibilityAction: string | null
  reviewerIds: string[]
}

export interface ReviewEventSourceReader {
  findSubmittedAssignment(
    reviewerAssignmentId: string,
    transaction: ReviewTransaction
  ): Promise<ReviewSubmittedAuthoritativeAssignment | null>
  findResolvedDispute(
    disputeId: string,
    reviewSessionId: string,
    transaction: ReviewTransaction
  ): Promise<DisputeResolvedAuthoritativeSource | null>
}

export interface ReviewProjectionLock {
  acquire(revieweeId: string, transaction: ReviewTransaction): Promise<void>
}

export interface ReviewConfirmedAccomplishmentProjector {
  project(
    identity: ReviewConfirmedAccomplishmentProjectionIdentity,
    transaction: ReviewTransaction
  ): Promise<void>
}

export interface ReviewEventProcessingPorts {
  transactions: ReviewTransactionRunner
  submittedReceipts: ReviewSubmittedReceiptStore
  confirmedReceipts: ReviewConfirmedReceiptStore
  disputeReceipts: DisputeResolvedReceiptStore
  sources: ReviewEventSourceReader
  projectionLock: ReviewProjectionLock
  accomplishmentProjector?: ReviewConfirmedAccomplishmentProjector
}
