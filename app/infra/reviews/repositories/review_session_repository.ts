import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { ReviewSessionStatus } from '#constants/review_constants'
import ReviewSession from '#models/review_session'
import type { DatabaseId } from '#types/database'

/**
 * ReviewSessionRepository
 *
 * Data access for review sessions.
 */
export default class ReviewSessionRepository {
  private readonly __instanceMarker = true

  static {
    void new ReviewSessionRepository().__instanceMarker
  }

  private static baseQuery(trx?: TransactionClientContract) {
    return trx ? ReviewSession.query({ client: trx }) : ReviewSession.query()
  }

  static async paginatePendingForReviewer(
    userId: DatabaseId,
    page: number,
    perPage: number,
    trx?: TransactionClientContract
  ) {
    return this.baseQuery(trx)
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

  static async findByIdWithRelations(
    sessionId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<ReviewSession> {
    return this.baseQuery(trx)
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

  static async paginateByReviewee(
    userId: DatabaseId,
    page: number,
    perPage: number,
    trx?: TransactionClientContract
  ) {
    return this.baseQuery(trx)
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

  static async findById(
    sessionId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<ReviewSession | null> {
    return this.baseQuery(trx).where('id', sessionId).first()
  }

  static async findByIdWithAllowedStatuses(
    sessionId: DatabaseId,
    statuses: string[],
    trx?: TransactionClientContract
  ): Promise<ReviewSession | null> {
    return this.baseQuery(trx).where('id', sessionId).whereIn('status', statuses).first()
  }

  static async findByTaskAssignment(
    taskAssignmentId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<ReviewSession | null> {
    return this.baseQuery(trx).where('task_assignment_id', taskAssignmentId).first()
  }

  static async findCompletedForRevieweeForUpdate(
    sessionId: DatabaseId,
    revieweeId: DatabaseId,
    trx: TransactionClientContract
  ): Promise<ReviewSession | null> {
    return this.baseQuery(trx)
      .where('id', sessionId)
      .where('reviewee_id', revieweeId)
      .where('status', ReviewSessionStatus.COMPLETED)
      .forUpdate()
      .first()
  }

  static async create(
    data: Partial<ReviewSession>,
    trx?: TransactionClientContract
  ): Promise<ReviewSession> {
    return ReviewSession.create(data, trx ? { client: trx } : undefined)
  }

  static async save(
    session: ReviewSession,
    trx?: TransactionClientContract
  ): Promise<ReviewSession> {
    if (trx) {
      session.useTransaction(trx)
    }
    await session.save()
    return session
  }

  static async hasAnyForTask(
    taskId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    const session = await this.baseQuery(trx)
      .whereHas('task_assignment', (assignmentQuery) => {
        void assignmentQuery.where('task_id', taskId)
      })
      .first()

    return !!session
  }

  static async hasAnyForTasksWithStatus(
    taskStatusId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    const session = await this.baseQuery(trx)
      .whereHas('task_assignment', (assignmentQuery) => {
        void assignmentQuery.whereHas('task', (taskQuery) => {
          void taskQuery.where('task_status_id', taskStatusId).whereNull('deleted_at')
        })
      })
      .first()

    return !!session
  }
}
