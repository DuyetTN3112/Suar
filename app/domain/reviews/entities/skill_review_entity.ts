/**
 * SkillReviewEntity — Pure Domain Entity
 *
 * Represents an individual skill rating within a review session.
 * 100% pure TypeScript, NO framework dependencies.
 */

export type SkillReviewerType = 'manager' | 'peer'

export interface SkillReviewEntityProps {
  id: string
  reviewSessionId: string
  reviewerId: string
  reviewerType: SkillReviewerType
  skillId: string
  assignedLevelCode: string
  comment: string | null
  createdAt: Date
  updatedAt: Date
}

export class SkillReviewEntity {
  readonly id: string
  readonly reviewSessionId: string
  readonly reviewerId: string
  readonly reviewerType: SkillReviewerType
  readonly skillId: string
  readonly assignedLevelCode: string
  readonly comment: string | null
  readonly createdAt: Date
  readonly updatedAt: Date

  constructor(props: SkillReviewEntityProps) {
    this.id = props.id
    this.reviewSessionId = props.reviewSessionId
    this.reviewerId = props.reviewerId
    this.reviewerType = props.reviewerType
    this.skillId = props.skillId
    this.assignedLevelCode = props.assignedLevelCode
    this.comment = props.comment
    this.createdAt = props.createdAt
    this.updatedAt = props.updatedAt
  }

  get isManagerReview(): boolean {
    return this.reviewerType === 'manager'
  }

  get isPeerReview(): boolean {
    return this.reviewerType === 'peer'
  }
}
