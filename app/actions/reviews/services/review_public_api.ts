import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import ReviewEvidenceRepository from '#infra/reviews/repositories/review_evidence_repository'
import ReviewSessionRepository from '#infra/reviews/repositories/review_session_repository'
import type { DatabaseId } from '#types/database'

export class ReviewPublicApi {
  async hasAnyForTask(taskId: DatabaseId, trx?: TransactionClientContract): Promise<boolean> {
    return ReviewSessionRepository.hasAnyForTask(taskId, trx)
  }

  async hasAnyForTasksWithStatus(
    taskStatusId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    return ReviewSessionRepository.hasAnyForTasksWithStatus(taskStatusId, trx)
  }

  async listEvidencesBySession(reviewSessionId: DatabaseId, trx?: TransactionClientContract) {
    return ReviewEvidenceRepository.listBySession(reviewSessionId, trx)
  }
}

export const reviewPublicApi = new ReviewPublicApi()
