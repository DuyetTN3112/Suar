import type {
  SerializedModelRecord,
  SerializableModelRecord,
  PaginatedControllerResult,
} from './model_response_serialization.js'
import { serializeModelCollectionForHttpResponse, serializeModelForHttpResponse } from './model_response_serialization.js'

import {
  fromLegacySnakePagination,
  toCanonicalApiPagination,
  toCanonicalPagePagination,
} from '#modules/pagination/public_contracts/pagination_public_api'
import type { ReviewRelatedTaskComment } from '#modules/reviews/actions/support/review_related_task_comments'
import { getCanonicalProficiencyLevelValue } from '#modules/skills/public_contracts/proficiency_framework'

const PROFICIENCY_CODE_KEYS = new Set([
  'verified_public_proficiency_code',
  'assigned_public_proficiency_code',
  'required_public_proficiency_code',
  'verifiedPublicProficiencyCode',
  'assignedPublicProficiencyCode',
  'requiredPublicProficiencyCode',
  'levelCode',
])

function toCanonicalLevelCode(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return undefined
  }

  return getCanonicalProficiencyLevelValue(value, value)
}

function normalizeSnapshotSkillArray(value: unknown, sourceKeys: string[]): unknown {
  if (!Array.isArray(value)) {
    return value
  }

  const items: unknown[] = value

  return items.map((item): unknown => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return item
    }

    const record = item as Record<string, unknown>
    let levelCode = toCanonicalLevelCode(record['levelCode'])

    if (!levelCode) {
      for (const key of sourceKeys) {
        const candidate = toCanonicalLevelCode(record[key])
        if (candidate) {
          levelCode = candidate
          break
        }
      }
    }

    if (!levelCode) {
      return item
    }

    return {
      ...record,
      levelCode,
    }
  })
}

function normalizeReviewCollectionRecord(record: unknown): unknown {
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    return record
  }

  const input = record as Record<string, unknown>
  const output: Record<string, unknown> = { ...input }

  if ('requiredSkillsSnapshot' in input) {
    output['requiredSkillsSnapshot'] = normalizeSnapshotSkillArray(input['requiredSkillsSnapshot'], [
      'verifiedPublicProficiencyCode',
      'requiredPublicProficiencyCode',
    ])
  }

  if ('skillReviewsSnapshot' in input) {
    output['skillReviewsSnapshot'] = normalizeSnapshotSkillArray(input['skillReviewsSnapshot'], [
      'assignedPublicProficiencyCode',
    ])
  }

  return output
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
      const camelKey = toCamelCaseKey(key)
      if (typeof nestedValue === 'string' && PROFICIENCY_CODE_KEYS.has(key)) {
        output[camelKey] = getCanonicalProficiencyLevelValue(nestedValue, nestedValue)
        continue
      }
      if (typeof nestedValue === 'string' && PROFICIENCY_CODE_KEYS.has(camelKey)) {
        output[camelKey] = getCanonicalProficiencyLevelValue(nestedValue, nestedValue)
        continue
      }

      output[camelKey] = camelizeResponseValue(nestedValue)
    }

    return output
  }

  return value
}

export function mapMyReviewsPageProps(
  result: PaginatedControllerResult<SerializableModelRecord | SerializedModelRecord>
) {
  return {
    reviews: serializeModelCollectionForHttpResponse(result.data),
    pagination: toCanonicalPagePagination(fromLegacySnakePagination(result.meta)),
  }
}

export function mapUserReviewsPageProps(
  result: PaginatedControllerResult<SerializableModelRecord | SerializedModelRecord>,
  userId: string
) {
  return {
    userId,
    reviews: serializeModelCollectionForHttpResponse(result.data),
    pagination: toCanonicalPagePagination(fromLegacySnakePagination(result.meta)),
  }
}

export function mapPendingReviewsPageProps(
  result: PaginatedControllerResult<SerializableModelRecord | SerializedModelRecord>
) {
  return {
    reviews: serializeModelCollectionForHttpResponse(result.data),
    pagination: toCanonicalPagePagination(fromLegacySnakePagination(result.meta)),
  }
}

export function mapShowReviewPageProps(
  session: SerializableModelRecord | SerializedModelRecord,
  skills: unknown,
  proficiencyLevels: unknown,
  disputeId: string | null = null,
  taskComments: ReviewRelatedTaskComment[] = []
) {
  return {
    session: serializeModelForHttpResponse(session),
    skills,
    proficiencyLevels,
    disputeId,
    taskComments,
  }
}


export function mapCreateReviewSessionApiBody(
  session: SerializableModelRecord | SerializedModelRecord
) {
  const record = serializeModelForHttpResponse(session) as Record<string, unknown>

  return {
    data: {
      id: record['id'],
      taskAssignmentId: record['taskAssignmentId'] ?? record['task_assignment_id'] ?? null,
      revieweeId: record['revieweeId'] ?? record['reviewee_id'] ?? null,
      status: record['status'] ?? null,
      managerReviewCompleted:
        record['managerReviewCompleted'] ?? record['manager_review_completed'] ?? null,
      creatorReviewerId: record['creatorReviewerId'] ?? record['creator_reviewer_id'] ?? null,
      creatorReviewCompleted:
        record['creatorReviewCompleted'] ?? record['creator_review_completed'] ?? null,
      managerReviewsCount: record['managerReviewsCount'] ?? record['manager_reviews_count'] ?? null,
      peerReviewsCount: record['peerReviewsCount'] ?? record['peer_reviews_count'] ?? null,
      requiredPeerReviews: record['requiredPeerReviews'] ?? record['required_peer_reviews'] ?? null,
      requiredTotalReviews: record['requiredTotalReviews'] ?? record['required_total_reviews'] ?? null,
      minimumManagerReviews:
        record['minimumManagerReviews'] ?? record['minimum_manager_reviews'] ?? null,
      minimumPeerReviews: record['minimumPeerReviews'] ?? record['minimum_peer_reviews'] ?? null,
      confirmations: record['confirmations'] ?? null,
      overallQualityScore: record['overallQualityScore'] ?? record['overall_quality_score'] ?? null,
      deliveryTimeliness: record['deliveryTimeliness'] ?? record['delivery_timeliness'] ?? null,
      requirementAdherence:
        record['requirementAdherence'] ?? record['requirement_adherence'] ?? null,
      communicationQuality:
        record['communicationQuality'] ?? record['communication_quality'] ?? null,
      codeQualityScore: record['codeQualityScore'] ?? record['code_quality_score'] ?? null,
      proactivenessScore: record['proactivenessScore'] ?? record['proactiveness_score'] ?? null,
      wouldWorkWithAgain: record['wouldWorkWithAgain'] ?? record['would_work_with_again'] ?? null,
      strengthsObserved: record['strengthsObserved'] ?? record['strengths_observed'] ?? null,
      areasForImprovement:
        record['areasForImprovement'] ?? record['areas_for_improvement'] ?? null,
      deadline: record['deadline'] ?? null,
      createdAt: record['createdAt'] ?? record['created_at'] ?? null,
      completedAt: record['completedAt'] ?? record['completed_at'] ?? null,
      updatedAt: record['updatedAt'] ?? record['updated_at'] ?? null,
    },
  }
}

export function mapReviewDataApiBody(data: unknown) {
  return {
    data: camelizeResponseValue(
      data && typeof data === 'object' && !Array.isArray(data) ? serializeModelForHttpResponse(data) : data
    ),
  }
}

export function mapReviewDisputeCommentApiBody(
  comment: SerializableModelRecord | SerializedModelRecord
) {
  const record = serializeModelForHttpResponse(comment) as Record<string, unknown>

  return {
    data: {
      id: record['id'],
      disputeId: record['disputeId'] ?? record['dispute_id'] ?? null,
      authorId: record['authorId'] ?? record['author_id'] ?? null,
      authorContext: record['authorContext'] ?? record['author_context'] ?? null,
      authorSystemRole: record['authorSystemRole'] ?? record['author_system_role'] ?? null,
      body: record['body'] ?? null,
      visibility: record['visibility'] ?? null,
      createdAt: record['createdAt'] ?? record['created_at'] ?? null,
      updatedAt: record['updatedAt'] ?? record['updated_at'] ?? null,
    },
  }
}

export function mapReviewCommentCollectionApiBody(
  comments: (SerializableModelRecord | SerializedModelRecord)[]
) {
  return {
    data: comments.map((comment) => mapReviewDisputeCommentApiBody(comment).data),
  }
}

export function mapReviewCollectionApiBody(
  records: (SerializableModelRecord | SerializedModelRecord)[],
  meta?: {
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
) {
  return {
    data: serializeModelCollectionForHttpResponse(records).map((record) =>
      normalizeReviewCollectionRecord(camelizeResponseValue(record))
    ),
    ...(meta
      ? {
          pagination: toCanonicalApiPagination(fromLegacySnakePagination(meta)),
        }
      : {}),
  }
}

export function mapFlaggedReviewsPageProps(
  result: PaginatedControllerResult<SerializableModelRecord | SerializedModelRecord>,
  statuses: string[],
  currentStatus: string | null
) {
  return {
    flaggedReviews: serializeModelCollectionForHttpResponse(result.data),
    pagination: toCanonicalPagePagination(fromLegacySnakePagination(result.meta)),
    statuses,
    currentStatus,
  }
}

export function mapReviewEvidenceCollectionApiBody(
  evidences: (SerializableModelRecord | SerializedModelRecord)[]
) {
  return {
    data: evidences.map((evidence) => mapReviewDisputeEvidenceApiBody(evidence).data),
  }
}

export function mapReviewDisputeEvidenceApiBody(
  evidence: SerializableModelRecord | SerializedModelRecord
) {
  const record = serializeModelForHttpResponse(evidence) as Record<string, unknown>

  return {
    data: {
      id: record['id'],
      disputeId: record['disputeId'] ?? record['dispute_id'] ?? null,
      uploaderId: record['uploaderId'] ?? record['uploader_id'] ?? record['uploaded_by'] ?? null,
      uploaderContext: record['uploaderContext'] ?? record['uploader_context'] ?? null,
      uploaderSystemRole:
        record['uploaderSystemRole'] ?? record['uploader_system_role'] ?? null,
      evidenceType: record['evidenceType'] ?? record['evidence_type'] ?? null,
      url: record['url'] ?? null,
      title: record['title'] ?? null,
      description: record['description'] ?? null,
      createdAt: record['createdAt'] ?? record['created_at'] ?? null,
      updatedAt: record['updatedAt'] ?? record['updated_at'] ?? null,
    },
  }
}

export function mapTaskSelfAssessmentApiBody(
  assessment: SerializableModelRecord | SerializedModelRecord | null
) {
  const data = assessment ? serializeModelForHttpResponse(assessment) : null

  if (!data) {
    return {
      data: null,
    }
  }

  const record = data as Record<string, unknown>
  const taskAssignmentId = record['taskAssignmentId'] ?? record['task_assignment_id'] ?? null
  const userId = record['userId'] ?? record['user_id'] ?? null
  const overallSatisfaction = record['overallSatisfaction'] ?? record['overall_satisfaction'] ?? null
  const difficultyFelt = record['difficultyFelt'] ?? record['difficulty_felt'] ?? null
  const confidenceLevel = record['confidenceLevel'] ?? record['confidence_level'] ?? null
  const whatWentWell = record['whatWentWell'] ?? record['what_went_well'] ?? null
  const whatWouldDoDifferent =
    record['whatWouldDoDifferent'] ?? record['what_would_do_different'] ?? null
  const blockersEncountered = record['blockersEncountered'] ?? record['blockers_encountered'] ?? []
  const skillsFeltLacking = record['skillsFeltLacking'] ?? record['skills_felt_lacking'] ?? []
  const skillsFeltStrong = record['skillsFeltStrong'] ?? record['skills_felt_strong'] ?? []
  const submittedAt = record['submittedAt'] ?? record['submitted_at'] ?? null

  return {
    data: {
      id: record['id'],
      taskAssignmentId,
      userId,
      overallSatisfaction,
      difficultyFelt,
      confidenceLevel,
      whatWentWell,
      whatWouldDoDifferent,
      blockersEncountered,
      skillsFeltLacking,
      skillsFeltStrong,
      submittedAt,
    },
  }
}
