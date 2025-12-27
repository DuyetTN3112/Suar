interface SkillRatingInput {
  skill_id?: string | null
  assigned_level_code?: string | null
  comment?: string | null
}

interface ReviewSubmissionInput {
  review_session_id?: string | null
  reviewer_type?: string | null
  skill_ratings?: SkillRatingInput[] | null
}

interface ValidationResult {
  valid: boolean
  errors: string[]
}

const VALID_LEVEL_CODES = new Set([
  'beginner',
  'junior',
  'middle',
  'senior',
  'lead',
  'principal',
  'master',
])

const VALID_REVIEWER_TYPES = new Set(['manager', 'peer', 'self'])

export function validateReviewSubmission(input: ReviewSubmissionInput): ValidationResult {
  const errors: string[] = []
  const sessionId = input.review_session_id?.trim() ?? ''
  const reviewerType = input.reviewer_type?.trim() ?? ''
  const ratings = input.skill_ratings ?? []

  if (!sessionId) {
    errors.push('Session ID is required')
  }

  if (!VALID_REVIEWER_TYPES.has(reviewerType)) {
    errors.push('Reviewer type must be one of: manager, peer, self')
  }

  if (ratings.length === 0) {
    errors.push('At least one skill rating is required')
  }

  for (const rating of ratings) {
    const levelCode = rating.assigned_level_code?.trim() ?? ''

    if (!VALID_LEVEL_CODES.has(levelCode)) {
      errors.push('Invalid skill level code')
    }

    if ((rating.comment ?? '').length > 2000) {
      errors.push('Comment must be at most 2000 characters')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
