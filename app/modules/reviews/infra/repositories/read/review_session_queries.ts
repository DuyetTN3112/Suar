import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { ReviewSessionStatus } from '#modules/reviews/constants/review_constants'
import ReviewSession from '#modules/reviews/infra/models/review_session'

const baseQuery = (trx?: TransactionClientContract) => {
  return trx ? ReviewSession.query({ client: trx }) : ReviewSession.query()
}

export const paginatePendingForReviewer = (
  userId: string,
  page: number,
  perPage: number,
  trx?: TransactionClientContract
) => {
  return baseQuery(trx)
    .whereIn('status', [ReviewSessionStatus.PENDING, ReviewSessionStatus.IN_PROGRESS])
    .whereDoesntHave('skill_reviews', (subQuery) => {
      void subQuery.where('reviewer_id', userId)
    })
    .preload('reviewee', (userQuery) => {
      void userQuery.select(['id', 'username', 'email'])
    })
    .preload('task_assignment', (assignmentQuery) => {
      void assignmentQuery.preload('task', (taskQuery) => {
        void taskQuery.select(['id', 'title', 'project_id'])
        void taskQuery.preload('project')
      })
    })
    .orderBy('created_at', 'asc')
    .paginate(page, perPage)
}

export const findByIdWithRelations = (
  sessionId: string,
  trx?: TransactionClientContract
): Promise<ReviewSession> => {
  return baseQuery(trx)
    .where('id', sessionId)
    .preload('reviewee')
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
  return baseQuery(trx)
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
    .preload('skill_reviews', (reviewQuery) => {
      void reviewQuery.preload('skill')
    })
    .orderBy('updated_at', 'desc')
    .paginate(page, perPage)
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
