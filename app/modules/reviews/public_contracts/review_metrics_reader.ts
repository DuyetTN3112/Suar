import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import ReviewMetricsRepository from '#modules/reviews/infra/repositories/read/review_metrics_repository'

export interface ReviewMetricsReader {
  listLatestConfidenceSignalsBySkill(
    userId: string,
    trx?: TransactionClientContract
  ): Promise<Array<{ skill_id: string; confidence: string | null }>>

  listActiveDisputedSkillIdsByReviewee(
    userId: string,
    trx?: TransactionClientContract
  ): Promise<Array<{ skill_id: string }>>
}

export const reviewMetricsReader: ReviewMetricsReader = {
  listLatestConfidenceSignalsBySkill: (...args) =>
    ReviewMetricsRepository.listLatestConfidenceSignalsBySkill(...args),
  listActiveDisputedSkillIdsByReviewee: (...args) =>
    ReviewMetricsRepository.listActiveDisputedSkillIdsByReviewee(...args),
}
