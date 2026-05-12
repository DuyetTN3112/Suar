import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { ReviewSessionStatus } from '#constants/review_constants'
import ReviewSession from '#infra/reviews/models/review_session'
import type { DatabaseId } from '#types/database'

const baseQuery = (trx?: TransactionClientContract) => {
  return trx ? ReviewSession.query({ client: trx }) : ReviewSession.query()
}

export const paginatePendingForReviewer = (
  userId: DatabaseId,
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
  sessionId: DatabaseId,
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
  userId: DatabaseId,
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
  sessionId: DatabaseId,
  trx?: TransactionClientContract
): Promise<ReviewSession | null> => {
  return baseQuery(trx).where('id', sessionId).first()
}

export const findByIdWithAllowedStatuses = (
  sessionId: DatabaseId,
  statuses: string[],
  trx?: TransactionClientContract
): Promise<ReviewSession | null> => {
  return baseQuery(trx).where('id', sessionId).whereIn('status', statuses).first()
}

export const findByTaskAssignment = (
  taskAssignmentId: DatabaseId,
  trx?: TransactionClientContract
): Promise<ReviewSession | null> => {
  return baseQuery(trx).where('task_assignment_id', taskAssignmentId).first()
}

export const hasAnyForTask = async (
  taskId: DatabaseId,
  trx?: TransactionClientContract
): Promise<boolean> => {
  const session = await baseQuery(trx)
    .whereHas('task_assignment', (assignmentQuery) => {
      void assignmentQuery.where('task_id', taskId)
    })
    .first()

  return !!session
}

export const hasAnyForTasksWithStatus = async (
  taskStatusId: DatabaseId,
  trx?: TransactionClientContract
): Promise<boolean> => {
  const session = await baseQuery(trx)
    .whereHas('task_assignment', (assignmentQuery) => {
      void assignmentQuery.whereHas('task', (taskQuery) => {
        void taskQuery.where('task_status_id', taskStatusId).whereNull('deleted_at')
      })
    })
    .first()

  return !!session
}
