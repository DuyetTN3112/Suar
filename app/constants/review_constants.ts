/**
 * Review Constants
 *
 * Constants liên quan đến ReviewSession, SkillReview, FlaggedReview,
 * ReverseReview, ReviewConfirmation, ReviewerCredibility.
 * Pattern: enum + options array + helper function
 *
 * @module ReviewConstants
 */

// ============================================================================
// Review Session Status
// ============================================================================

/**
 * Trạng thái của phiên đánh giá 360°
 */
export enum ReviewSessionStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  DISPUTED = 'disputed',
}

export const reviewSessionStatusOptions = [
  {
    label: 'Pending',
    labelVi: 'Chờ đánh giá',
    value: ReviewSessionStatus.PENDING,
    style: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    color: '#f59e0b',
  },
  {
    label: 'In Progress',
    labelVi: 'Đang đánh giá',
    value: ReviewSessionStatus.IN_PROGRESS,
    style: 'bg-blue-100 text-blue-800 border-blue-200',
    color: '#3b82f6',
  },
  {
    label: 'Completed',
    labelVi: 'Hoàn thành',
    value: ReviewSessionStatus.COMPLETED,
    style: 'bg-green-100 text-green-800 border-green-200',
    color: '#22c55e',
  },
  {
    label: 'Disputed',
    labelVi: 'Tranh chấp',
    value: ReviewSessionStatus.DISPUTED,
    style: 'bg-red-100 text-red-800 border-red-200',
    color: '#ef4444',
  },
]

export function getReviewSessionStatusName(status: ReviewSessionStatus): string {
  return reviewSessionStatusOptions.find((option) => option.value === status)?.label ?? 'Unknown'
}

export function getReviewSessionStatusNameVi(status: ReviewSessionStatus): string {
  return (
    reviewSessionStatusOptions.find((option) => option.value === status)?.labelVi ??
    'Không xác định'
  )
}

// ============================================================================
// Flagged Review Status
// ============================================================================

/**
 * Trạng thái của đánh giá bị gắn cờ bất thường
 */
export enum FlaggedReviewStatus {
  PENDING = 'pending',
  REVIEWED = 'reviewed',
  DISMISSED = 'dismissed',
  CONFIRMED = 'confirmed',
}

export const flaggedReviewStatusOptions = [
  {
    label: 'Pending',
    labelVi: 'Chờ xem xét',
    value: FlaggedReviewStatus.PENDING,
    style: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    color: '#f59e0b',
  },
  {
    label: 'Reviewed',
    labelVi: 'Đã xem xét',
    value: FlaggedReviewStatus.REVIEWED,
    style: 'bg-blue-100 text-blue-800 border-blue-200',
    color: '#3b82f6',
  },
  {
    label: 'Dismissed',
    labelVi: 'Bỏ qua',
    value: FlaggedReviewStatus.DISMISSED,
    style: 'bg-gray-100 text-gray-800 border-gray-200',
    color: '#6b7280',
  },
  {
    label: 'Confirmed',
    labelVi: 'Xác nhận vi phạm',
    value: FlaggedReviewStatus.CONFIRMED,
    style: 'bg-red-100 text-red-800 border-red-200',
    color: '#ef4444',
  },
]

export function getFlaggedReviewStatusName(status: FlaggedReviewStatus): string {
  return flaggedReviewStatusOptions.find((option) => option.value === status)?.label ?? 'Unknown'
}

export function getFlaggedReviewStatusNameVi(status: FlaggedReviewStatus): string {
  return (
    flaggedReviewStatusOptions.find((option) => option.value === status)?.labelVi ??
    'Không xác định'
  )
}

// ============================================================================
// Reviewer Type
// ============================================================================

/**
 * Loại người đánh giá trong SkillReview
 */
export enum ReviewerType {
  MANAGER = 'manager',
  PEER = 'peer',
}

export const reviewerTypeOptions = [
  {
    label: 'Manager',
    labelVi: 'Quản lý',
    value: ReviewerType.MANAGER,
    description: 'Đánh giá từ quản lý trực tiếp',
  },
  {
    label: 'Peer',
    labelVi: 'Đồng nghiệp',
    value: ReviewerType.PEER,
    description: 'Đánh giá từ đồng nghiệp cùng cấp',
  },
]

// ============================================================================
// Reverse Review Target Type
// ============================================================================

/**
 * Đối tượng được đánh giá ngược (360° feedback)
 */
export enum ReverseReviewTargetType {
  PEER = 'peer',
  MANAGER = 'manager',
  PROJECT = 'project',
  ORGANIZATION = 'organization',
}

export const reverseReviewTargetTypeOptions = [
  {
    label: 'Peer',
    labelVi: 'Đồng nghiệp',
    value: ReverseReviewTargetType.PEER,
  },
  {
    label: 'Manager',
    labelVi: 'Quản lý',
    value: ReverseReviewTargetType.MANAGER,
  },
  {
    label: 'Project',
    labelVi: 'Dự án',
    value: ReverseReviewTargetType.PROJECT,
  },
  {
    label: 'Organization',
    labelVi: 'Tổ chức',
    value: ReverseReviewTargetType.ORGANIZATION,
  },
]

// ============================================================================
// Review Confirmation Action
// ============================================================================

/**
 * Hành động xác nhận kết quả đánh giá
 */
export enum ReviewConfirmationAction {
  CONFIRMED = 'confirmed',
  DISPUTED = 'disputed',
}

export const reviewConfirmationActionOptions = [
  {
    label: 'Confirmed',
    labelVi: 'Đồng ý',
    value: ReviewConfirmationAction.CONFIRMED,
    style: 'bg-green-100 text-green-800 border-green-200',
    color: '#22c55e',
  },
  {
    label: 'Disputed',
    labelVi: 'Phản đối',
    value: ReviewConfirmationAction.DISPUTED,
    style: 'bg-red-100 text-red-800 border-red-200',
    color: '#ef4444',
  },
]

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
