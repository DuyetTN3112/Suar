export type ReviewDisputeWarningRecipient = 'reviewee' | 'counterparty' | 'admin'

export interface ReviewDisputeReadinessInput {
  taskSnapshot: unknown
  assignmentSnapshot: unknown
  submissionSnapshot: unknown
  reviewSnapshot: unknown
  skillReviewsSnapshot: unknown[] | null | undefined
  disputeClaimSnapshot: {
    dispute_reason?: string | null
    requested_outcome?: string | null
    dispute_comments?: Array<{
      author_context?: string | null
      body?: string | null
    }>
  } | null
  taskCommentsSnapshot?: unknown[] | null
  evidencesSnapshot?: unknown[] | null
  selfAssessmentSnapshot?: unknown
  taskHistorySnapshot?: unknown[] | null
  reviewerContextSnapshot?: unknown
  revieweeProfileContextSnapshot?: unknown
  overrideReadiness?: boolean
  overrideReason?: string | null
}

export interface ReviewDisputeReadinessResult {
  readyForNormalResolution: boolean
  missingRequired: string[]
  missingRecommended: string[]
  warningRecipients: ReviewDisputeWarningRecipient[]
}

export function evaluateReviewDisputeReadiness(
  input: ReviewDisputeReadinessInput
): ReviewDisputeReadinessResult {
  const missingRequired = collectMissingRequiredData(input)
  const missingRecommended = collectMissingRecommendedData(input)

  if (missingRequired.length === 0) {
    return {
      readyForNormalResolution: true,
      missingRequired,
      missingRecommended,
      warningRecipients: [],
    }
  }

  if (input.overrideReadiness) {
    if (!input.overrideReason || input.overrideReason.trim().length === 0) {
      return {
        readyForNormalResolution: false,
        missingRequired: [...missingRequired, 'override_reason'],
        missingRecommended,
        warningRecipients: ['reviewee', 'counterparty', 'admin'],
      }
    }

    return {
      readyForNormalResolution: true,
      missingRequired,
      missingRecommended,
      warningRecipients: ['reviewee', 'counterparty', 'admin'],
    }
  }

  return {
    readyForNormalResolution: false,
    missingRequired,
    missingRecommended,
    warningRecipients: ['reviewee', 'counterparty', 'admin'],
  }
}

function collectMissingRequiredData(input: ReviewDisputeReadinessInput): string[] {
  const missing: string[] = []

  if (!input.taskSnapshot) missing.push('task_snapshot')
  if (!input.assignmentSnapshot) missing.push('assignment_snapshot')
  if (!input.submissionSnapshot) missing.push('submission_snapshot')
  if (!input.reviewSnapshot) missing.push('review_snapshot')
  if (!input.skillReviewsSnapshot || input.skillReviewsSnapshot.length === 0) {
    missing.push('skill_reviews_snapshot')
  }
  if (!input.disputeClaimSnapshot) {
    missing.push('dispute_claim_snapshot')
  }

  const disputeComments = input.disputeClaimSnapshot?.dispute_comments ?? []
  const hasRevieweeMessage = disputeComments.some(
    (comment) => comment.author_context === 'reviewee' && hasText(comment.body)
  )
  const hasCounterpartyMessage = disputeComments.some(
    (comment) => comment.author_context !== 'reviewee' && hasText(comment.body)
  )

  if (!hasRevieweeMessage) missing.push('reviewee_dispute_message')
  if (!hasCounterpartyMessage) missing.push('counterparty_dispute_message')

  return missing
}

function collectMissingRecommendedData(input: ReviewDisputeReadinessInput): string[] {
  const missing: string[] = []

  if (!input.taskCommentsSnapshot || input.taskCommentsSnapshot.length === 0) {
    missing.push('task_comments_snapshot')
  }
  if (!input.evidencesSnapshot || input.evidencesSnapshot.length === 0) {
    missing.push('evidences_snapshot')
  }
  if (!input.selfAssessmentSnapshot) {
    missing.push('self_assessment_snapshot')
  }
  if (!input.taskHistorySnapshot || input.taskHistorySnapshot.length === 0) {
    missing.push('task_history_snapshot')
  }
  if (!input.reviewerContextSnapshot) {
    missing.push('reviewer_context_snapshot')
  }
  if (!input.revieweeProfileContextSnapshot) {
    missing.push('reviewee_profile_context_snapshot')
  }

  return missing
}

function hasText(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0
}
