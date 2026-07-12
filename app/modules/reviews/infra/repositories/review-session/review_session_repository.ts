import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import * as reviewSessionQueries from '../read/review_session_queries.js'
import * as reviewSessionMutations from '../write/review_session_mutations.js'

import type ReviewSession from '#modules/reviews/infra/models/review-session/review_session'

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

  static async findPendingForReviewerCursor(
    userId: string,
    projectTaskAssignmentIds: string[],
    options?: { limit?: number; after?: string | null; before?: string | null },
    trx?: TransactionClientContract
  ) {
    return reviewSessionQueries.findPendingForReviewerCursor(
      userId,
      projectTaskAssignmentIds,
      options,
      trx
    )
  }

  static async findByIdWithRelations(
    sessionId: string,
    trx?: TransactionClientContract
  ): Promise<ReviewSession> {
    return reviewSessionQueries.findByIdWithRelations(sessionId, trx)
  }

  static async paginateByReviewee(
    userId: string,
    page: number,
    perPage: number,
    trx?: TransactionClientContract
  ) {
    return reviewSessionQueries.paginateByReviewee(userId, page, perPage, trx)
  }

  static async findById(
    sessionId: string,
    trx?: TransactionClientContract
  ): Promise<ReviewSession | null> {
    return reviewSessionQueries.findById(sessionId, trx)
  }

  static async findByIdWithAllowedStatuses(
    sessionId: string,
    statuses: string[],
    trx?: TransactionClientContract
  ): Promise<ReviewSession | null> {
    return reviewSessionQueries.findByIdWithAllowedStatuses(sessionId, statuses, trx)
  }

  static async findByIdWithAllowedStatusesForUpdate(
    sessionId: string,
    statuses: string[],
    trx: TransactionClientContract
  ): Promise<ReviewSession | null> {
    return reviewSessionQueries.findByIdWithAllowedStatusesForUpdate(
      sessionId,
      statuses,
      trx
    )
  }

  static async findByTaskAssignment(
    taskAssignmentId: string,
    trx?: TransactionClientContract
  ): Promise<ReviewSession | null> {
    return reviewSessionQueries.findByTaskAssignment(taskAssignmentId, trx)
  }

  static async findCompletedForRevieweeForUpdate(
    sessionId: string,
    revieweeId: string,
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
      assignmentId: string
      assigneeId: string
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

  static async hasAnyForTaskAssignmentIds(
    taskAssignmentIds: string[],
    trx?: TransactionClientContract
  ): Promise<boolean> {
    return reviewSessionQueries.hasAnyForTaskAssignmentIds(taskAssignmentIds, trx)
  }

  static async countPendingForTaskAssignmentIds(
    taskAssignmentIds: string[],
    trx?: TransactionClientContract
  ): Promise<number> {
    return reviewSessionQueries.countPendingForTaskAssignmentIds(taskAssignmentIds, trx)
  }
}
