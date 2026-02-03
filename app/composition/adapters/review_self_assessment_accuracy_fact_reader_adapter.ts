import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import ListSelfAssessmentAccuracyFactsV1Query from '#modules/reviews/actions/queries/list_self_assessment_accuracy_facts_v1_query'
import { LucidSelfAssessmentAccuracyFactSourceReader } from '#modules/reviews/infra/adapters/lucid_review_fact_source_readers'
import type {
  UserSelfAssessmentAccuracyFact,
  UserSelfAssessmentAccuracyFactReader,
} from '#modules/users/actions/ports/outbound/user_self_assessment_accuracy_fact_reader'

export class ReviewSelfAssessmentAccuracyFactReaderAdapter
  implements UserSelfAssessmentAccuracyFactReader
{
  async listSelfAssessmentAccuracyFacts(
    userId: string,
    period: { periodStart?: string | null; periodEnd?: string | null },
    trx: TransactionClientContract
  ): Promise<UserSelfAssessmentAccuracyFact[]> {
    const facts = await new ListSelfAssessmentAccuracyFactsV1Query(
      new LucidSelfAssessmentAccuracyFactSourceReader()
    ).execute(userId, period, trx)

    return facts
  }
}

export const selfAssessmentAccuracyFactReader =
  new ReviewSelfAssessmentAccuracyFactReaderAdapter()
