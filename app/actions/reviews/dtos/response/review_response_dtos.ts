/**
 * Review Response DTOs — Application Layer
 *
 * Data Transfer Objects for review API responses.
 * Pure TypeScript interfaces, no framework dependencies.
 */

import type { ReviewConfirmationEntry } from '#types/database'

export interface ReviewSessionResponseDTO {
  id: string
  taskAssignmentId: string
  revieweeId: string
  status: string
  managerReviewCompleted: boolean
  peerReviewsCount: number
  requiredPeerReviews: number
  peerReviewProgress: string
  confirmations: ReviewConfirmationEntry[] | null
  deadline: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface SkillReviewResponseDTO {
  id: string
  reviewSessionId: string
  reviewerId: string
  reviewerType: string
  skillId: string
  assignedLevelCode: string
  comment: string | null
  createdAt: string
  updatedAt: string
}

export interface ReviewSummaryResponseDTO {
  session: ReviewSessionResponseDTO
  skillReviews: SkillReviewResponseDTO[]
  totalSkillReviews: number
}
