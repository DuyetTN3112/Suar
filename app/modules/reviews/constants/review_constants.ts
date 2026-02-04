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

/**
 * Trạng thái của đánh giá bị gắn cờ bất thường
 * v3.0 CHECK: 'pending', 'reviewed', 'dismissed', 'confirmed'
 */
export enum FlaggedReviewStatus {
  PENDING = 'pending',
  REVIEWED = 'reviewed',
  DISMISSED = 'dismissed',
  CONFIRMED = 'confirmed',
}

// ============================================================================
// Anomaly Flag Type (v3.0: was anomaly_flags table)
// ============================================================================

/**
 * Anomaly flag types — v3.0 inline CHECK trên flagged_reviews.flag_type
 * CHECK ('sudden_spike','mutual_high','bulk_same_level',
 *        'frequency_anomaly','new_account_high','ip_collusion')
 */
export enum AnomalyFlagType {
  SUDDEN_SPIKE = 'sudden_spike',
  MUTUAL_HIGH = 'mutual_high',
  BULK_SAME_LEVEL = 'bulk_same_level',
  FREQUENCY_ANOMALY = 'frequency_anomaly',
  NEW_ACCOUNT_HIGH = 'new_account_high',
  IP_COLLUSION = 'ip_collusion',
}

// ============================================================================
// Anomaly Severity (v3.0: was in anomaly_flags table)
// ============================================================================

/**
 * Anomaly severity — v3.0 inline CHECK trên flagged_reviews.severity
 * CHECK ('low','medium','high','critical')
 */
export enum AnomalySeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

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

// ============================================================================
// Review Defaults
// ============================================================================

/**
 * Giá trị mặc định cho hệ thống đánh giá
 */
export const REVIEW_DEFAULTS = {
  /** Số peer reviews tối thiểu cần có */
  MIN_PEER_REVIEWS: 2,
  /** Điểm credibility khởi điểm cho reviewer mới */
  INITIAL_CREDIBILITY_SCORE: 50,
  /** Điểm credibility tối đa */
  MAX_CREDIBILITY_SCORE: 100,
  /** Rating tối thiểu (1 sao) */
  MIN_RATING: 1,
  /** Rating tối đa (5 sao) */
  MAX_RATING: 5,
} as const
