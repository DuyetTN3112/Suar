export type ReviewerAssignmentStatus = 'pending' | 'submitted' | 'waived'

export interface NativeReviewerAssignmentAuthorizationRow {
  readonly reviewerId: string
  readonly reviewerType: 'manager' | 'peer'
  readonly assignmentRole:
    | 'creator_required'
    | 'manager_required'
    | 'peer_required'
    | 'manager_optional'
    | 'peer_optional'
  readonly status: ReviewerAssignmentStatus
}

export interface LegacyReviewerAuthorizationRow {
  readonly reviewerId: string
  readonly reviewerRole: string
  readonly status: string
}

export interface ReviewObservationReviewerAuthorization {
  readonly reviewerRole: string
  readonly reviewerType: 'manager' | 'peer' | 'legacy'
}

/**
 * Native reviewer assignments are authoritative once a session has them.
 * Legacy workflow rows remain a compatibility path only for sessions that
 * predate the native assignment boundary.
 */
export function resolveReviewObservationReviewerAuthorization(input: {
  readonly reviewerId: string
  readonly nativeAssignments: readonly NativeReviewerAssignmentAuthorizationRow[]
  readonly legacyReviewer: LegacyReviewerAuthorizationRow | null
}): ReviewObservationReviewerAuthorization | null {
  if (input.nativeAssignments.length > 0) {
    const assignment = input.nativeAssignments.find(
      (candidate) =>
        candidate.reviewerId === input.reviewerId &&
        (candidate.status === 'pending' || candidate.status === 'submitted')
    )
    if (!assignment) return null

    return {
      reviewerRole: assignment.assignmentRole,
      reviewerType: assignment.reviewerType,
    }
  }

  if (
    !input.legacyReviewer ||
    input.legacyReviewer.reviewerId !== input.reviewerId ||
    !['pending', 'submitted'].includes(input.legacyReviewer.status)
  ) {
    return null
  }

  const reviewerRole = input.legacyReviewer.reviewerRole.trim()
  if (!reviewerRole) return null

  return {
    reviewerRole,
    reviewerType: 'legacy',
  }
}
