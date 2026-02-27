import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

export interface TaskReviewSessionCreatorInput {
  taskAssignmentId: string
  taskId: string
  revieweeUserId: string
  reviewerUserId: string | null
  completedAt: string
  trx?: TransactionClientContract
}

export interface TaskReviewSessionCreator {
  createReviewSessionForCompletedAssignment(
    input: TaskReviewSessionCreatorInput
  ): Promise<void>
}
