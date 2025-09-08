import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import ReviewEvidenceRepository from '#modules/reviews/infra/repositories/review_evidence_repository'
import ReviewSessionRepository from '#modules/reviews/infra/repositories/review_session_repository'

export class ReviewPublicApi {
  async hasAnyForTask(taskId: string, trx?: TransactionClientContract): Promise<boolean> {
    return ReviewSessionRepository.hasAnyForTask(taskId, trx)
  }

  async countPendingForProject(
    projectId: string,
    trx?: TransactionClientContract
  ): Promise<number> {
    return ReviewSessionRepository.countPendingForProject(projectId, trx)
  }

  async hasAnyForTasksWithStatus(
    taskStatusId: string,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    return ReviewSessionRepository.hasAnyForTasksWithStatus(taskStatusId, trx)
  }

  async listEvidencesBySession(reviewSessionId: string, trx?: TransactionClientContract) {
    return ReviewEvidenceRepository.listBySession(reviewSessionId, trx)
  }
}

export const reviewPublicApi = new ReviewPublicApi()
