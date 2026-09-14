/**
 * Dispute Constants
 *
 * Bounded Context: Disputes & AI Arbitration
 */

export enum ReviewDisputeStatus {
  PENDING = 'pending',
  COLLECTING_EVIDENCE = 'collecting_evidence',
  ADMIN_REVIEWING = 'admin_reviewing',
  AI_REVIEWING = 'ai_reviewing',
  RESOLVED = 'resolved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

export const ACTIVE_REVIEW_DISPUTE_STATUSES = [
  ReviewDisputeStatus.PENDING,
  ReviewDisputeStatus.COLLECTING_EVIDENCE,
  ReviewDisputeStatus.ADMIN_REVIEWING,
  ReviewDisputeStatus.AI_REVIEWING,
] as const

export const TERMINAL_REVIEW_DISPUTE_STATUSES = [
  ReviewDisputeStatus.RESOLVED,
  ReviewDisputeStatus.REJECTED,
  ReviewDisputeStatus.CANCELLED,
] as const

export enum ReviewDisputeResolutionDecision {
  UPHOLD_REVIEW = 'uphold_review',
  ADJUST_SCORE = 'adjust_score',
  REQUEST_RE_REVIEW = 'request_re_review',
  DISMISS_DISPUTE = 'dismiss_dispute',
  PARTIALLY_ACCEPT = 'partially_accept',
}
