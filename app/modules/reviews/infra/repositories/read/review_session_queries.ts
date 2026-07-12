import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import {
  decodeTimestampCursor,
  encodeTimestampCursor,
} from '#modules/pagination/public_contracts/pagination_public_api'
import ReviewSession from '#modules/reviews/infra/models/review-session/review_session'
import { ReviewSessionStatus } from '#modules/reviews/public_contracts/review_constants'

const baseQuery = (trx?: TransactionClientContract) => {
  return trx ? ReviewSession.query({ client: trx }) : ReviewSession.query()
}

function buildPendingReviewBaseQuery(
  userId: string,
  projectTaskAssignmentIds: string[],
  trx?: TransactionClientContract
) {
  const query = baseQuery(trx)
    .whereIn('status', [ReviewSessionStatus.PENDING, ReviewSessionStatus.IN_PROGRESS])
    .whereNot('reviewee_id', userId)
    .whereDoesntHave('skill_reviews', (subQuery) => {
      void subQuery.where('reviewer_id', userId)
    })
    .where((accessQuery) => {
      void accessQuery.whereHas('reviewer_assignments', (assignmentQuery) => {
        void assignmentQuery.where('reviewer_id', userId).where('status', 'pending')
      })

      if (projectTaskAssignmentIds.length > 0) {
        void accessQuery.orWhereIn('task_assignment_id', projectTaskAssignmentIds)
      }
    })

  return query
}

function applyStableReviewSessionOrder(
  query: ReturnType<typeof ReviewSession.query>,
  primaryField: 'created_at' | 'updated_at',
  sortOrder: 'asc' | 'desc'
): void {
  void query.orderBy(primaryField, sortOrder).orderBy('id', sortOrder)
}

export async function findPendingForReviewerCursor(
  userId: string,
  projectTaskAssignmentIds: string[],
  options?: { limit?: number; after?: string | null; before?: string | null },
  trx?: TransactionClientContract
): Promise<{
  data: ReviewSession[]
  total: number
  nextCursor: string | null
  previousCursor: string | null
  hasNextPage: boolean
  hasPreviousPage: boolean
}> {
  const limit = Math.max(1, options?.limit ?? 10)
  const decodedCursor = decodeTimestampCursor(options?.after)
  const decodedBeforeCursor = decodeTimestampCursor(options?.before)
  const isBeforeWindow = Boolean(decodedBeforeCursor && !decodedCursor)
  const totalResult = (await buildPendingReviewBaseQuery(userId, projectTaskAssignmentIds, trx)
    .clone()
    .clearOrder()
    .count('* as total')
    .first()) as { $extras?: { total?: number | string } } | null
  const rawTotal = totalResult?.$extras?.total
  const total =
    typeof rawTotal === 'number'
      ? rawTotal
      : typeof rawTotal === 'string'
        ? Number(rawTotal)
        : 0

  const rowsQuery = buildPendingReviewBaseQuery(userId, projectTaskAssignmentIds, trx)
    .preload('reviewer_assignments', (assignmentQuery) => {
      void assignmentQuery
        .where('reviewer_id', userId)
        .where('status', 'pending')
    })

  if (decodedCursor) {
    void rowsQuery.where((builder) => {
      void builder
        .where('created_at', '<', decodedCursor.createdAt)
        .orWhere((nested) => {
          void nested.where('created_at', decodedCursor.createdAt).where('id', '<', decodedCursor.id)
        })
    })
  } else if (decodedBeforeCursor) {
    void rowsQuery.where((builder) => {
      void builder
        .where('created_at', '>', decodedBeforeCursor.createdAt)
        .orWhere((nested) => {
          void nested.where('created_at', decodedBeforeCursor.createdAt).where('id', '>', decodedBeforeCursor.id)
        })
    })
  }

  applyStableReviewSessionOrder(rowsQuery, 'created_at', isBeforeWindow ? 'asc' : 'desc')
  const rows = await rowsQuery.limit(limit + 1)
  const hasOverflow = rows.length > limit
  const windowRows = hasOverflow ? rows.slice(0, limit) : rows
  const pageRows = isBeforeWindow ? [...windowRows].reverse() : windowRows
  const firstRow = pageRows[0]
  const lastRow = pageRows[pageRows.length - 1]

  return {
    data: pageRows,
    total: Number.isFinite(total) ? total : 0,
    nextCursor:
      (isBeforeWindow || hasOverflow) && lastRow
        ? encodeTimestampCursor({
            createdAt: lastRow.created_at.toISO() ?? new Date().toISOString(),
            id: lastRow.id,
          })
        : null,
    previousCursor:
      (decodedCursor || isBeforeWindow) && firstRow
        ? encodeTimestampCursor({
            createdAt: firstRow.created_at.toISO() ?? new Date().toISOString(),
            id: firstRow.id,
          })
        : null,
    hasNextPage: isBeforeWindow ? Boolean(decodedBeforeCursor) : hasOverflow,
    hasPreviousPage: isBeforeWindow ? hasOverflow : Boolean(decodedCursor),
  }
}

export const findByIdWithRelations = (
  sessionId: string,
  trx?: TransactionClientContract
): Promise<ReviewSession> => {
  return baseQuery(trx)
    .where('id', sessionId)
    .preload('reviewer_assignments')
    .preload('skill_reviews', (reviewQuery) => {
      void reviewQuery.orderBy('created_at', 'asc').orderBy('id', 'asc')
    })
    .firstOrFail()
}

export const paginateByReviewee = (
  userId: string,
  page: number,
  perPage: number,
  trx?: TransactionClientContract
) => {
  const query = baseQuery(trx)
    .where('reviewee_id', userId)
    .whereIn('status', [
      ReviewSessionStatus.PENDING,
      ReviewSessionStatus.IN_PROGRESS,
      ReviewSessionStatus.COMPLETED,
      ReviewSessionStatus.DISPUTED,
    ])
    .preload('reviewer_assignments')
    .preload('skill_reviews', (reviewQuery) => {
      void reviewQuery.orderBy('created_at', 'asc').orderBy('id', 'asc')
    })

  applyStableReviewSessionOrder(query, 'updated_at', 'desc')
  return query.paginate(page, perPage)
}

export const findById = (
  sessionId: string,
  trx?: TransactionClientContract
): Promise<ReviewSession | null> => {
  return baseQuery(trx).where('id', sessionId).first()
}

export const findByIdWithAllowedStatuses = (
  sessionId: string,
  statuses: string[],
  trx?: TransactionClientContract
): Promise<ReviewSession | null> => {
  return baseQuery(trx).where('id', sessionId).whereIn('status', statuses).first()
}

export const findByIdWithAllowedStatusesForUpdate = (
  sessionId: string,
  statuses: string[],
  trx: TransactionClientContract
): Promise<ReviewSession | null> => {
  return baseQuery(trx)
    .where('id', sessionId)
    .whereIn('status', statuses)
    .forUpdate()
    .first()
}

export const findByTaskAssignment = (
  taskAssignmentId: string,
  trx?: TransactionClientContract
): Promise<ReviewSession | null> => {
  return baseQuery(trx).where('task_assignment_id', taskAssignmentId).first()
}

export const hasAnyForTaskAssignmentIds = async (
  taskAssignmentIds: string[],
  trx?: TransactionClientContract
): Promise<boolean> => {
  if (taskAssignmentIds.length === 0) {
    return false
  }
  const session = await baseQuery(trx).whereIn('task_assignment_id', taskAssignmentIds).first()

  return !!session
}

export const countPendingForTaskAssignmentIds = async (
  taskAssignmentIds: string[],
  trx?: TransactionClientContract
): Promise<number> => {
  if (taskAssignmentIds.length === 0) {
    return 0
  }
  const result = await baseQuery(trx)
    .whereIn('status', [ReviewSessionStatus.PENDING, ReviewSessionStatus.IN_PROGRESS])
    .whereIn('task_assignment_id', taskAssignmentIds)
    .count('* as total')
    .first()

  const countRow = result as { $extras?: { total?: unknown } } | null
  const rawTotal = countRow?.$extras?.total
  const total =
    typeof rawTotal === 'number'
      ? rawTotal
      : typeof rawTotal === 'string'
        ? Number(rawTotal)
        : 0

  return Number.isFinite(total) ? total : 0
}
