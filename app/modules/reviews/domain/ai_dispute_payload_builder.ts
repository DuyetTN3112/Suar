const SENSITIVE_KEYS = new Set([
  'access_token',
  'refresh_token',
  'password',
  'email',
  'phone',
  'private_contact',
])

function sanitize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitize(item))
  }

  if (value && typeof value === 'object') {
    const output: Record<string, unknown> = {}
    for (const [key, nestedValue] of Object.entries(value)) {
      if (SENSITIVE_KEYS.has(key)) continue
      output[key] = sanitize(nestedValue)
    }
    return output
  }

  return value
}

export function buildAiDisputePayload(caseFile: {
  id: string
  dispute_id: string
  task_snapshot: Record<string, unknown>
  required_skills_snapshot: Record<string, unknown>[]
  assignment_snapshot: Record<string, unknown>
  submission_snapshot: Record<string, unknown>
  review_snapshot: Record<string, unknown>
  skill_reviews_snapshot: Record<string, unknown>[]
  evidences_snapshot: Record<string, unknown>[]
  task_comments_snapshot: Record<string, unknown>[]
  dispute_claim_snapshot: Record<string, unknown>
  reviewer_context_snapshot: Record<string, unknown>
  reviewee_profile_context_snapshot: Record<string, unknown>
}) {
  return {
    case_id: caseFile.dispute_id,
    case_file_id: caseFile.id,
    task: sanitize(caseFile.task_snapshot) as Record<string, unknown>,
    required_skills: sanitize(caseFile.required_skills_snapshot) as Record<string, unknown>[],
    assignment: sanitize(caseFile.assignment_snapshot) as Record<string, unknown>,
    submission: sanitize(caseFile.submission_snapshot) as Record<string, unknown>,
    review: sanitize(caseFile.review_snapshot) as Record<string, unknown>,
    skill_reviews: sanitize(caseFile.skill_reviews_snapshot) as Record<string, unknown>[],
    evidences: sanitize(caseFile.evidences_snapshot) as Record<string, unknown>[],
    comments: sanitize(caseFile.task_comments_snapshot) as Record<string, unknown>[],
    dispute_claim: sanitize(caseFile.dispute_claim_snapshot) as Record<string, unknown>,
    reviewer_context: sanitize(caseFile.reviewer_context_snapshot) as Record<string, unknown>,
    reviewee_context: sanitize(caseFile.reviewee_profile_context_snapshot) as Record<string, unknown>,
  }
}
