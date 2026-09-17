/**
 * Review Constants
 *
 * Constants liên quan đến ReviewSession, SkillReview, FlaggedReview,
 * ReverseReview, ReviewConfirmation, ReviewerCredibility.
 * v3.0: anomaly_flags table xóa → flag_type + severity inline trên flagged_reviews
 *       review_confirmations table xóa → confirmations JSONB trên review_sessions
 *
 * CLEANUP 2026-03-01:
 *   - XÓA tất cả *Options arrays → 0 usages (frontend không import)
 *   - XÓA tất cả get*Name/get*NameVi helper functions → 0 usages
 *   - GIỮ tất cả enums → map trực tiếp với DB v3 CHECK constraints
 *
 * @module ReviewConstants
 */

// ============================================================================
// Review Session Status
// ============================================================================

/**
 * Trạng thái của phiên đánh giá 360°
 * v3.0 CHECK: 'pending', 'in_progress', 'completed', 'disputed'
 */
export enum ReviewSessionStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  DISPUTED = 'disputed',
}

// ============================================================================
// Flagged Review Status
// ============================================================================

export {
  FlaggedReviewStatus,
  AnomalyFlagType,
  AnomalySeverity,
} from '#modules/moderation/domain/moderation_constants'


// ============================================================================
// Reviewer Type
// ============================================================================

/**
 * Loại người đánh giá trong SkillReview
 * v3.0 CHECK: 'manager', 'peer'
 */
export enum ReviewerType {
  MANAGER = 'manager',
  PEER = 'peer',
}

// ============================================================================
// Reverse Review Target Type
// ============================================================================

/**
 * Đối tượng được đánh giá ngược (360° feedback)
 * v3.0 CHECK: 'peer', 'manager', 'project', 'organization'
 */
export enum ReverseReviewTargetType {
  PEER = 'peer',
  MANAGER = 'manager',
  PROJECT = 'project',
  ORGANIZATION = 'organization',
}

// ============================================================================
// Review Confirmation Action
// ============================================================================

/**
 * Hành động xác nhận kết quả đánh giá
 * v3.0: review_confirmations table merged → review_sessions.confirmations JSONB
 *       Enum vẫn giữ để validate JSONB entries
 */
export enum ReviewConfirmationAction {
  CONFIRMED = 'confirmed',
  DISPUTED = 'disputed',
}

export const REVIEW_CONFIRMATION_ACTION_VALUES = Object.values(ReviewConfirmationAction)

export {
  ReviewDisputeStatus,
} from '#modules/disputes/domain/dispute_constants'

// ============================================================================
// Review Defaults
// ============================================================================

/**
 * Giá trị mặc định cho hệ thống đánh giá
 */
export const REVIEW_DEFAULTS = {
  /** Số peer reviews tối thiểu cần có */
  MIN_PEER_REVIEWS: 2,
  /** Tổng reviewer distinct tối thiểu */
  MIN_TOTAL_REVIEWS: 2,
  /** Số manager-side reviews tối thiểu */
  MIN_MANAGER_REVIEWS: 1,
  /** Số peer-side reviews tối thiểu */
  MINIMUM_PEER_REVIEWS: 2,
  /** Điểm credibility khởi điểm cho reviewer mới */
  INITIAL_CREDIBILITY_SCORE: 50,
  /** Điểm credibility tối đa */
  MAX_CREDIBILITY_SCORE: 100,
  /** Rating tối thiểu (1 sao) */
  MIN_RATING: 1,
  /** Rating tối đa (5 sao) */
  MAX_RATING: 5,
  /** SLA mặc định cho một review session */
  REVIEW_SESSION_DEADLINE_HOURS: 72,
} as const

// ============================================================================
// Dispute Side-Effect Actions (Task 9: replace magic strings)
// ============================================================================

/**
 * Profile update actions for dispute resolution.
 * These replace freeform strings in resolve_review_dispute_command.
 */
export const PROFILE_UPDATE_ACTION = {
  RECALCULATE: 'recalculate_after_adjustment',
  NO_ACTION: 'no_action',
} as const

export type ProfileUpdateAction = (typeof PROFILE_UPDATE_ACTION)[keyof typeof PROFILE_UPDATE_ACTION]

/**
 * Reviewer credibility actions for dispute resolution.
 */
export const REVIEWER_CREDIBILITY_ACTION = {
  MARK_DISPUTED: 'mark_disputed_review',
  NO_ACTION: 'no_action',
} as const

export type ReviewerCredibilityAction = (typeof REVIEWER_CREDIBILITY_ACTION)[keyof typeof REVIEWER_CREDIBILITY_ACTION]

/**
 * Valid profile update actions for validation.
 */
export const VALID_PROFILE_UPDATE_ACTIONS = new Set<string>(Object.values(PROFILE_UPDATE_ACTION))

/**
 * Valid reviewer credibility actions for validation.
 */
export const VALID_REVIEWER_CREDIBILITY_ACTIONS = new Set<string>(Object.values(REVIEWER_CREDIBILITY_ACTION))

export {
  ACTIVE_REVIEW_DISPUTE_STATUSES,
  TERMINAL_REVIEW_DISPUTE_STATUSES,
} from '#modules/disputes/domain/dispute_constants'

