export type ProfileReviewEligibilityReasonV1 =
  | 'reviewee_confirmation_missing'
  | 'session_not_final'
  | 'active_dispute'
  | 'dispute_not_publishable'
  | 'request_re_review'
  | 'reviewee_confirmed'
  | 'resolved_dispute_publishable'
  | 'review_session_missing'
  | 'multiple_review_sessions'

export interface ProfileReviewSkillRatingFactV1 {
  skillReviewId: string
  skillId: string
  assignedPublicProficiencyCode: string
  reviewerType: 'manager' | 'peer'
}

export interface ProfileReviewEvidenceFactV1 {
  evidenceId: string
  evidenceType: string
  url: string | null
  title: string | null
}

interface ProfileReviewFactBaseV1 {
  contractVersion: 1
  taskAssignmentId: string
  revieweeUserId: string
  sourceUpdatedAt: string | null
}

export interface ProfileReviewReplacementFactV1 extends ProfileReviewFactBaseV1 {
  disposition: 'replacement'
  reason: 'reviewee_confirmed' | 'resolved_dispute_publishable'
  reviewSessionId: string
  overallQualityScore: number | null
  skillRatings: ProfileReviewSkillRatingFactV1[]
  evidences: ProfileReviewEvidenceFactV1[]
}

export interface ProfileReviewTombstoneFactV1 extends ProfileReviewFactBaseV1 {
  disposition: 'tombstone'
  reason: Exclude<
    ProfileReviewEligibilityReasonV1,
    'reviewee_confirmed' | 'resolved_dispute_publishable'
  >
  reviewSessionId: string | null
}

export type ProfileReviewFactV1 =
  | ProfileReviewReplacementFactV1
  | ProfileReviewTombstoneFactV1
