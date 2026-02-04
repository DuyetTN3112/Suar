/**
 * ReviewSessionEntity — Pure Domain Entity
 *
 * Represents a 360° review session in the business domain.
 * 100% pure TypeScript, NO framework dependencies.
 */

export type ReviewSessionStatus = 'pending' | 'in_progress' | 'completed' | 'disputed'

export interface ReviewConfirmationEntry {
  user_id: string
  action: 'confirmed' | 'disputed'
  dispute_reason?: string | null
  created_at: string
}

export interface ReviewSessionEntityProps {
  id: string
  taskAssignmentId: string
  revieweeId: string
  status: ReviewSessionStatus
  managerReviewCompleted: boolean
  peerReviewsCount: number
  requiredPeerReviews: number
  confirmations: ReviewConfirmationEntry[] | null
  deadline: Date | null
  completedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export class ReviewSessionEntity {
  readonly id: string
  readonly taskAssignmentId: string
  readonly revieweeId: string
  readonly status: ReviewSessionStatus
  readonly managerReviewCompleted: boolean
  readonly peerReviewsCount: number
  readonly requiredPeerReviews: number
  readonly confirmations: ReviewConfirmationEntry[] | null
  readonly deadline: Date | null
  readonly completedAt: Date | null
  readonly createdAt: Date
  readonly updatedAt: Date

  constructor(props: ReviewSessionEntityProps) {
    this.id = props.id
    this.taskAssignmentId = props.taskAssignmentId
    this.revieweeId = props.revieweeId
    this.status = props.status
    this.managerReviewCompleted = props.managerReviewCompleted
    this.peerReviewsCount = props.peerReviewsCount
    this.requiredPeerReviews = props.requiredPeerReviews
    this.confirmations = props.confirmations
    this.deadline = props.deadline
    this.completedAt = props.completedAt
    this.createdAt = props.createdAt
    this.updatedAt = props.updatedAt
  }

  get isCompleted(): boolean {
    return this.status === 'completed'
  }

  get isPending(): boolean {
    return this.status === 'pending'
  }

  get isOverdue(): boolean {
    if (!this.deadline) return false
    return !this.isCompleted && new Date() > this.deadline
  }

  get canAddPeerReview(): boolean {
    return !this.isCompleted && this.peerReviewsCount < this.requiredPeerReviews
  }

  get peerReviewProgress(): string {
    return `${this.peerReviewsCount}/${this.requiredPeerReviews}`
  }
}
