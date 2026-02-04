import type { UserTransaction } from './user_transaction.js'

export interface UserSelfAssessmentAccuracyFact {
  taskAssignmentId: string
  selfScore: number
  reviewedScore: number
  reviewCompletedAt: string
}

export interface UserSelfAssessmentAccuracyFactReader {
  listSelfAssessmentAccuracyFacts(
    userId: string,
    period: { periodStart?: string | null; periodEnd?: string | null },
    trx: UserTransaction
  ): Promise<UserSelfAssessmentAccuracyFact[]>
}
