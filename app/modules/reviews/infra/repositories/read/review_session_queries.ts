import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import {
  decodeTimestampCursor,
  encodeTimestampCursor,
} from '#modules/pagination/public_contracts/pagination_public_api'
import { ReviewSessionStatus } from '#modules/reviews/constants/review_constants'
import ReviewSession from '#modules/reviews/infra/models/review_session'

const baseQuery = (trx?: TransactionClientContract) => {
  return trx ? ReviewSession.query({ client: trx }) : ReviewSession.query()
}

function buildPendingReviewBaseQuery(userId: string, trx?: TransactionClientContract) {
  return baseQuery(trx)
    .whereIn('status', [ReviewSessionStatus.PENDING, ReviewSessionStatus.IN_PROGRESS])
    .whereNot('reviewee_id', userId)
    .whereDoesntHave('skill_reviews', (subQuery) => {
      void subQuery.where('reviewer_id', userId)
    })
    .where((accessQuery) => {
      void accessQuery
        .whereHas('reviewer_assignments', (assignmentQuery) => {
          void assignmentQuery.where('reviewer_id', userId).where('status', 'pending')
        })
        .orWhereHas('task_assignment', (assignmentQuery) => {
          void assignmentQuery.whereHas('task', (taskQuery) => {
            void taskQuery.whereHas('project', (projectQuery) => {
              void projectQuery.whereHas('project_members', (memberQuery) => {
                void memberQuery.where('user_id', userId)
              })
            })
          })
        })
    })
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
  const totalResult = (await buildPendingReviewBaseQuery(userId, trx)
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

  const rowsQuery = buildPendingReviewBaseQuery(userId, trx)
    .preload('reviewee', (userQuery) => {
      void userQuery.select(['id', 'username', 'email'])
    })
    .preload('reviewer_assignments', (assignmentQuery) => {
      void assignmentQuery
        .where('reviewer_id', userId)
        .where('status', 'pending')
        .preload('reviewer', (userQuery) => {
          void userQuery.select(['id', 'username', 'email'])
        })
    })
    .preload('task_assignment', (assignmentQuery) => {
      void assignmentQuery.preload('task', (taskQuery) => {
        void taskQuery.select(['id', 'title', 'project_id'])
        void taskQuery.preload('project')
      })
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
    .preload('reviewee')
    .preload('reviewer_assignments', (assignmentQuery) => {
      void assignmentQuery.preload('reviewer', (userQuery) => {
        void userQuery.select(['id', 'username', 'email'])
      })
    })
    .preload('task_assignment', (assignmentQuery) => {
      void assignmentQuery.preload('task')
    })
    .preload('skill_reviews', (reviewQuery) => {
      void reviewQuery.preload('skill')
      void reviewQuery.preload(
        'reviewer',
        (userQuery) => void userQuery.select(['id', 'username', 'email'])
      )
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
    .preload('task_assignment', (assignmentQuery) => {
      void assignmentQuery.preload('task', (taskQuery) => {
        void taskQuery.select(['id', 'title'])
      })
    })
    .preload('reviewer_assignments', (assignmentQuery) => {
      void assignmentQuery.preload('reviewer', (userQuery) => {
        void userQuery.select(['id', 'username', 'email'])
      })
    })
    .preload('skill_reviews', (reviewQuery) => {
      void reviewQuery.preload('skill')
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

export const findByTaskAssignment = (
  taskAssignmentId: string,
  trx?: TransactionClientContract
): Promise<ReviewSession | null> => {
  return baseQuery(trx).where('task_assignment_id', taskAssignmentId).first()
}

export const hasAnyForTask = async (
  taskId: string,
  trx?: TransactionClientContract
): Promise<boolean> => {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(taskId)) {
    return false
  }
  const session = await baseQuery(trx)
    .whereHas('task_assignment', (assignmentQuery) => {
      void assignmentQuery.where('task_id', taskId)
    })
    .first()

  return !!session
}

export const countPendingForProject = async (
  projectId: string,
  trx?: TransactionClientContract
): Promise<number> => {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId)) {
    return 0
  }
  const result = await baseQuery(trx)
    .whereIn('status', [ReviewSessionStatus.PENDING, ReviewSessionStatus.IN_PROGRESS])
    .whereHas('task_assignment', (assignmentQuery) => {
      void assignmentQuery.whereHas('task', (taskQuery) => {
        void taskQuery.where('project_id', projectId).whereNull('deleted_at')
      })
    })
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

export const hasAnyForTasksWithStatus = async (
  taskStatusId: string,
  trx?: TransactionClientContract
): Promise<boolean> => {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(taskStatusId)) {
    return false
  }
  const session = await baseQuery(trx)
    .whereHas('task_assignment', (assignmentQuery) => {
      void assignmentQuery.whereHas('task', (taskQuery) => {
        void taskQuery.where('task_status_id', taskStatusId).whereNull('deleted_at')
      })
    })
    .first()

  return !!session
}
