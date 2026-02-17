export interface FlaggedReviewPersonProjection {
  id: string
  username: string
  email: string | null
}

export interface FlaggedReviewModerationProjection {
  id: string
  skill_review_id: string
  flag_type: string
  severity: string
  detected_at: string | null
  status: 'pending' | 'reviewed' | 'dismissed' | 'confirmed'
  reviewed_by: string | null
  reviewed_at: string | null
  notes: string | null
  created_at: string | null
  updated_at: string | null
  suspicious_reviewer: FlaggedReviewPersonProjection
  reviewee: FlaggedReviewPersonProjection
  moderator: FlaggedReviewPersonProjection | null
  comment: string | null
  assigned_public_proficiency_code: string
  skill: {
    id: string
    name: string
    category_code: string | null
  }
  task: {
    id: string
    title: string
    description: string
  } | null
  task_assignment_id: string
  task_assignment_unavailable?: true
  review_session_id: string
}

export interface LegacyFlaggedReviewPageProjection {
  id: string
  skill_review_id: string
  flag_type: string
  severity: string
  detected_at: string | null
  status: FlaggedReviewModerationProjection['status']
  reviewed_by: string | null
  reviewed_at: string | null
  notes: string | null
  created_at: string | null
  updated_at: string | null
  reviewer: FlaggedReviewPersonProjection | null
  skill_review: {
    review_session_id: string
    comment: string | null
    assigned_public_proficiency_code: string
    reviewer: FlaggedReviewPersonProjection
    review_session: {
      reviewee: FlaggedReviewPersonProjection
    }
    skill: {
      id: string
      skill_name: string
      category_code: string | null
    }
  }
}
