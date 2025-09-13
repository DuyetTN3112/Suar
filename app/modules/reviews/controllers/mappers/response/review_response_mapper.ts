import type {
  ResponseRecord,
  SerializableResponseRecord,
  PaginatedControllerResult,
} from './shared.js'
import { serializeCollectionForResponse, serializeForResponse } from './shared.js'

export function mapMyReviewsPageProps(
  result: PaginatedControllerResult<SerializableResponseRecord | ResponseRecord>
) {
  return {
    reviews: serializeCollectionForResponse(result.data),
    meta: result.meta,
  }
}

export function mapUserReviewsPageProps(
  result: PaginatedControllerResult<SerializableResponseRecord | ResponseRecord>,
  userId: string
) {
  return {
    userId,
    reviews: serializeCollectionForResponse(result.data),
    meta: result.meta,
  }
}

export function mapPendingReviewsPageProps(
  result: PaginatedControllerResult<SerializableResponseRecord | ResponseRecord>
) {
  return {
    reviews: serializeCollectionForResponse(result.data),
    meta: result.meta,
  }
}

export function mapShowReviewPageProps(
  session: SerializableResponseRecord | ResponseRecord,
  skills: unknown,
  proficiencyLevels: unknown,
  disputeId: string | null = null
) {
  return {
    session: serializeForResponse(session),
    skills,
    proficiencyLevels,
    disputeId,
  }
}


export function mapCreateReviewSessionApiBody(
  session: SerializableResponseRecord | ResponseRecord
) {
  return {
    success: true,
    data: serializeForResponse(session),
  }
}

export function mapReviewDataApiBody(data: unknown) {
  return {
    success: true,
    data:
      data && typeof data === 'object' && !Array.isArray(data) ? serializeForResponse(data) : data,
  }
}

export function mapReviewDisputeCommentApiBody(
  comment: SerializableResponseRecord | ResponseRecord
) {
  return {
    success: true,
    data: serializeForResponse(comment),
  }
}

export function mapReviewCommentCollectionApiBody(
  comments: (SerializableResponseRecord | ResponseRecord)[]
) {
  return {
    success: true,
    data: serializeCollectionForResponse(comments),
  }
}

export function mapReviewCollectionApiBody(
  records: (SerializableResponseRecord | ResponseRecord)[]
) {
  return {
    success: true,
    data: serializeCollectionForResponse(records),
  }
}

export function mapFlaggedReviewsPageProps(
  result: PaginatedControllerResult<SerializableResponseRecord | ResponseRecord>,
  statuses: string[],
  currentStatus: string | null
) {
  return {
    flaggedReviews: serializeCollectionForResponse(result.data),
    meta: result.meta,
    statuses,
    currentStatus,
  }
}

export function mapReviewEvidenceCollectionApiBody(
  evidences: (SerializableResponseRecord | ResponseRecord)[]
) {
  return {
    success: true,
    data: serializeCollectionForResponse(evidences),
  }
}

export function mapTaskSelfAssessmentApiBody(
  assessment: SerializableResponseRecord | ResponseRecord | null
) {
  return {
    success: true,
    data: assessment ? serializeForResponse(assessment) : null,
  }
}
