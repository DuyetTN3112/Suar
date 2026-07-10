import {
  fromLegacySnakePagination,
  toCanonicalApiPagination,
} from '#modules/pagination/public_contracts/pagination_public_api'

interface LegacyPaginationLike {
  total: number
  per_page: number
  current_page: number
  last_page: number
  cursor?: {
    next_cursor: string | null
    previous_cursor: string | null
    has_next_page: boolean
    has_previous_page: boolean
  }
}

export function mapLegacyPagination(meta: LegacyPaginationLike) {
  return toCanonicalApiPagination(fromLegacySnakePagination(meta))
}

export function mapReviewDisputeListItem(item: {
  id: string
  source_type?: string
  dispute_review_type?: string
  review_session_id: string | null
  task_assignment_id: string | null
  task_id: string | null
  organization_id?: string | null
  project_id?: string | null
  sprint_id?: string | null
  reviewee_id: string
  opened_by: string
  status: string
  dispute_reason: string
  requested_outcome: string
  final_decision: string | null
  final_rationale: string | null
  created_at: string
  resolved_at: string | null
  task_title: string | null
  reviewee_username: string | null
  review_session_status: string | null
  comments_count: number
  evidences_count: number
  latest_case_version?: number | null
  ai_evaluations_count?: number
}) {
  return {
    id: item.id,
    sourceType: item.source_type ?? 'review_dispute',
    disputeReviewType: item.dispute_review_type ?? 'task_review',
    reviewSessionId: item.review_session_id,
    taskAssignmentId: item.task_assignment_id,
    taskId: item.task_id,
    organizationId: item.organization_id ?? null,
    projectId: item.project_id ?? null,
    sprintId: item.sprint_id ?? null,
    revieweeId: item.reviewee_id,
    openedBy: item.opened_by,
    status: item.status,
    disputeReason: item.dispute_reason,
    requestedOutcome: item.requested_outcome,
    finalDecision: item.final_decision,
    finalRationale: item.final_rationale,
    createdAt: item.created_at,
    resolvedAt: item.resolved_at,
    taskTitle: item.task_title,
    revieweeUsername: item.reviewee_username,
    reviewSessionStatus: item.review_session_status,
    commentsCount: item.comments_count,
    evidencesCount: item.evidences_count,
    ...(item.latest_case_version !== undefined && {
      latestCaseVersion: item.latest_case_version,
    }),
    ...(item.ai_evaluations_count !== undefined && {
      aiEvaluationsCount: item.ai_evaluations_count,
    }),
  }
}

export function mapReviewDisputeListApiBody(
  items: Parameters<typeof mapReviewDisputeListItem>[0][],
  meta: LegacyPaginationLike
) {
  return {
    data: items.map(mapReviewDisputeListItem),
    pagination: mapLegacyPagination(meta),
  }
}
