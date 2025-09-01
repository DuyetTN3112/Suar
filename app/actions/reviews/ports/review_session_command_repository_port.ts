import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { DatabaseId } from '#types/database'

export interface CreateReviewSessionForCompletedAssignmentInput {
  assignmentId: DatabaseId
  assigneeId: DatabaseId
}

export interface ReviewSessionCommandRepositoryPort {
  createForCompletedAssignmentIfMissing(
    input: CreateReviewSessionForCompletedAssignmentInput,
    trx?: TransactionClientContract
  ): Promise<boolean>
}
