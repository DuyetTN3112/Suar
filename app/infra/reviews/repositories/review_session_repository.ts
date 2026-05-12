import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import * as reviewSessionQueries from './read/review_session_queries.js'
import * as reviewSessionMutations from './write/review_session_mutations.js'

import type ReviewSession from '#infra/reviews/models/review_session'
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

  static async paginatePendingForReviewer(
    userId: DatabaseId,
    page: number,
    perPage: number,
    trx?: TransactionClientContract
  ) {
    return reviewSessionQueries.paginatePendingForReviewer(userId, page, perPage, trx)
  }

  static async findByIdWithRelations(
    sessionId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<ReviewSession> {
    return reviewSessionQueries.findByIdWithRelations(sessionId, trx)
  }

  static async paginateByReviewee(
    userId: DatabaseId,
    page: number,
    perPage: number,
    trx?: TransactionClientContract
  ) {
    return reviewSessionQueries.paginateByReviewee(userId, page, perPage, trx)
  }

  static async findById(
    sessionId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<ReviewSession | null> {
    return reviewSessionQueries.findById(sessionId, trx)
  }

  static async findByIdWithAllowedStatuses(
    sessionId: DatabaseId,
    statuses: string[],
    trx?: TransactionClientContract
  ): Promise<ReviewSession | null> {
    return reviewSessionQueries.findByIdWithAllowedStatuses(sessionId, statuses, trx)
  }

  static async findByTaskAssignment(
    taskAssignmentId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<ReviewSession | null> {
    return reviewSessionQueries.findByTaskAssignment(taskAssignmentId, trx)
  }

  static async findCompletedForRevieweeForUpdate(
    sessionId: DatabaseId,
    revieweeId: DatabaseId,
    trx: TransactionClientContract
  ): Promise<ReviewSession | null> {
    return reviewSessionMutations.findCompletedForRevieweeForUpdate(sessionId, revieweeId, trx)
  }

  static async create(
    data: Partial<ReviewSession>,
    trx?: TransactionClientContract
  ): Promise<ReviewSession> {
    return reviewSessionMutations.create(data, trx)
  }

  static async createForCompletedAssignmentIfMissing(
    input: {
      assignmentId: DatabaseId
      assigneeId: DatabaseId
    },
    trx?: TransactionClientContract
  ): Promise<boolean> {
    return reviewSessionMutations.createForCompletedAssignmentIfMissing(input, trx)
  }

  static async save(
    session: ReviewSession,
    trx?: TransactionClientContract
  ): Promise<ReviewSession> {
    return reviewSessionMutations.save(session, trx)
  }

  static async hasAnyForTask(
    taskId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    return reviewSessionQueries.hasAnyForTask(taskId, trx)
  }

  static async hasAnyForTasksWithStatus(
    taskStatusId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    return reviewSessionQueries.hasAnyForTasksWithStatus(taskStatusId, trx)
  }
}
