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

type Serializable = {
  serialize?: () => Record<string, unknown>
  toJSON?: () => Record<string, unknown>
}

function serializeRecord(record: unknown): Record<string, unknown> {
  if (!record || typeof record !== 'object') {
    return {}
  }
  const serializable = record as Serializable
  if (typeof serializable.serialize === 'function') {
    return serializable.serialize()
  }
  if (typeof serializable.toJSON === 'function') {
    return serializable.toJSON()
  }
  return record as Record<string, unknown>
}

export function mapLegacyPagination(meta: LegacyPaginationLike) {
  return toCanonicalApiPagination(fromLegacySnakePagination(meta))
}

function toCamelCaseKey(key: string): string {
  return key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())
}

function camelizeResponseValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => camelizeResponseValue(item))
  }

  if (value && typeof value === 'object') {
    const input = value as Record<string, unknown>
    const output: Record<string, unknown> = {}

    for (const [key, nestedValue] of Object.entries(input)) {
      output[toCamelCaseKey(key)] = camelizeResponseValue(nestedValue)
    }

    return output
  }

  return value
}

export function mapReviewDisputeDataApiBody(data: unknown) {
  return {
    data: camelizeResponseValue(serializeRecord(data)),
  }
}

export function mapReviewDisputeCollectionApiBody(records: unknown[], meta?: LegacyPaginationLike) {
  return {
    data: Array.isArray(records)
      ? records.map((record) => camelizeResponseValue(serializeRecord(record)))
      : [],
    ...(meta ? { pagination: mapLegacyPagination(meta) } : {}),
  }
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

export function mapReviewDisputeCommentApiBody(comment: unknown) {
  const record = serializeRecord(comment)

  return {
    data: {
      id: record['id'] as string,
      disputeId: (record['disputeId'] ?? record['dispute_id'] ?? null) as string | null,
      authorId: (record['authorId'] ?? record['author_id'] ?? null) as string | null,
      authorContext: (record['authorContext'] ?? record['author_context'] ?? null) as string | null,
      authorSystemRole: (record['authorSystemRole'] ?? record['author_system_role'] ?? null) as string | null,
      body: (record['body'] ?? null) as string | null,
      visibility: (record['visibility'] ?? null) as string | null,
      createdAt: (record['createdAt'] ?? record['created_at'] ?? null) as string | null,
      updatedAt: (record['updatedAt'] ?? record['updated_at'] ?? null) as string | null,
    },
  }
}

export function mapReviewCommentCollectionApiBody(comments: unknown[]) {
  return {
    data: comments.map((comment) => mapReviewDisputeCommentApiBody(comment).data),
  }
}

export function mapReviewDisputeEvidenceApiBody(evidence: unknown) {
  const record = serializeRecord(evidence)

  return {
    data: {
      id: record['id'] as string,
      reviewSessionId: (record['reviewSessionId'] ?? record['review_session_id'] ?? null) as string | null,
      disputeId: (record['disputeId'] ?? record['dispute_id'] ?? null) as string | null,
      uploaderId: (record['uploaderId'] ?? record['uploader_id'] ?? record['uploaded_by'] ?? null) as string | null,
      uploadedBy: (record['uploadedBy'] ?? record['uploaded_by'] ?? null) as string | null,
      uploaderContext: (record['uploaderContext'] ?? record['uploader_context'] ?? null) as string | null,
      uploaderSystemRole: (record['uploaderSystemRole'] ?? record['uploader_system_role'] ?? null) as string | null,
      evidenceType: (record['evidenceType'] ?? record['evidence_type'] ?? null) as string | null,
      url: (record['url'] ?? null) as string | null,
      title: (record['title'] ?? null) as string | null,
      description: (record['description'] ?? null) as string | null,
      origin: (record['origin'] ?? null) as string | null,
      origins: (record['origins'] ?? null) as string[] | null,
      verificationStatus: (record['verificationStatus'] ?? record['verification_status'] ?? null) as string | null,
      isSensitive: (record['isSensitive'] ?? record['is_sensitive'] ?? null) as boolean | null,
      createdAt: (record['createdAt'] ?? record['created_at'] ?? null) as string | null,
      updatedAt: (record['updatedAt'] ?? record['updated_at'] ?? null) as string | null,
    },
  }
}

export function mapReviewEvidenceCollectionApiBody(evidences: unknown[]) {
  return {
    data: evidences.map((evidence) => mapReviewDisputeEvidenceApiBody(evidence).data),
  }
}
