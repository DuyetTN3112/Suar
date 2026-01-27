import type { UserTransaction } from './user_transaction.js'

export interface UserProfileReviewSkillRatingFact {
  skillId: string
  skillName: string
  assignedPublicProficiencyCode: string
  reviewerType: 'manager' | 'peer'
}

export interface UserProfileReviewEvidenceFact {
  evidenceId: string
  evidenceType: string
  url: string | null
  title: string | null
}

interface UserProfileReviewFactBase {
  taskAssignmentId: string
  sourceUpdatedAt: string | null
}

export interface UserProfileReviewReplacementFact extends UserProfileReviewFactBase {
  disposition: 'replacement'
  overallQualityScore: number | null
  skillRatings: UserProfileReviewSkillRatingFact[]
  evidences: UserProfileReviewEvidenceFact[]
}

export interface UserProfileReviewTombstoneFact extends UserProfileReviewFactBase {
  disposition: 'tombstone'
}

export type UserProfileReviewFact =
  | UserProfileReviewReplacementFact
  | UserProfileReviewTombstoneFact

export interface UserProfileReviewFactReader {
  listProfileReviewFacts(
    revieweeUserId: string,
    taskAssignmentIds: string[],
    trx: UserTransaction
  ): Promise<UserProfileReviewFact[]>
}
