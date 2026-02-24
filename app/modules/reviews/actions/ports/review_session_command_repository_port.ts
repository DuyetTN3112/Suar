import type { TransactionClientContract } from '@adonisjs/lucid/types/database'


export interface CreateReviewSessionForCompletedAssignmentInput {
  assignmentId: string
  assigneeId: string
}

export interface ReviewSessionCommandRepositoryPort {
  createForCompletedAssignmentIfMissing(
    input: CreateReviewSessionForCompletedAssignmentInput,
    trx?: TransactionClientContract
  ): Promise<boolean>
}
