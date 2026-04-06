import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type {
  ProfileReviewFactSourceReader,
  ProfileReviewSourceSnapshot,
  SelfAssessmentAccuracyFactSourceReader,
  SelfAssessmentAccuracySourceSnapshot,
  TalentExplainabilityFactSourceReader,
  TalentExplainabilitySourceSnapshot,
} from '#modules/reviews/actions/ports/outbound/review_fact_source_readers'
import type { ReviewTransaction } from '#modules/reviews/actions/ports/outbound/review_transaction'
import { toLucidReviewTransaction } from '#modules/reviews/infra/adapters/lucid_review_transaction_runner'
import {
  listProfileReviewDisputes,
  listProfileReviewEvidences,
  listProfileReviewSessions,
  listProfileReviewSkillRatings,
} from '#modules/reviews/infra/repositories/read/profile_review_fact_queries'
import {
  listSelfAssessmentAccuracyDisputeRows,
  listSelfAssessmentAccuracySourceRows,
} from '#modules/reviews/infra/repositories/read/self_assessment_accuracy_fact_queries'
import {
  getTalentExplainabilitySourceRevision,
  listTalentExplainabilityDisputes,
  listTalentExplainabilityRatings,
  listTalentExplainabilitySessions,
  lockTalentExplainabilityProjectionUsers,
} from '#modules/reviews/infra/repositories/read/talent_explainability_projection_queries'

export class LucidProfileReviewFactSourceReader implements ProfileReviewFactSourceReader {
  async load(
    revieweeUserId: string,
    taskAssignmentIds: string[],
    transaction?: ReviewTransaction
  ): Promise<ProfileReviewSourceSnapshot> {
    const trx = toLucidReviewTransaction(transaction)
    const sessions = await listProfileReviewSessions(revieweeUserId, taskAssignmentIds, trx)
    const sessionIds = sessions.map((session) => session.id)
    const disputes = await listProfileReviewDisputes(sessionIds, trx)
    const ratings = await listProfileReviewSkillRatings(sessionIds, trx)
    const evidences = await listProfileReviewEvidences(sessionIds, trx)
    return { sessions, disputes, ratings, evidences }
  }
}

export class LucidSelfAssessmentAccuracyFactSourceReader
  implements SelfAssessmentAccuracyFactSourceReader
{
  async load(
    userId: string,
    transaction?: ReviewTransaction
  ): Promise<SelfAssessmentAccuracySourceSnapshot> {
    const trx = toLucidReviewTransaction(transaction)
    const sources = await listSelfAssessmentAccuracySourceRows(userId, trx)
    const disputes = await listSelfAssessmentAccuracyDisputeRows(
      sources.map((source) => source.review_session_id),
      trx
    )
    return { sources, disputes }
  }
}

export class LucidTalentExplainabilityFactSourceReader
  implements TalentExplainabilityFactSourceReader
{
  load(
    revieweeUserIds: string[],
    transaction?: ReviewTransaction
  ): Promise<TalentExplainabilitySourceSnapshot> {
    const trx = toLucidReviewTransaction(transaction)
    return trx
      ? this.loadWithTransaction(revieweeUserIds, trx)
      : db.transaction((snapshotTrx) =>
          this.loadWithTransaction(revieweeUserIds, snapshotTrx)
        )
  }

  private async loadWithTransaction(
    revieweeUserIds: string[],
    trx: TransactionClientContract
  ): Promise<TalentExplainabilitySourceSnapshot> {
    await lockTalentExplainabilityProjectionUsers(revieweeUserIds, trx)
    const sessions = await listTalentExplainabilitySessions(revieweeUserIds, trx)
    const sessionIds = sessions.map((session) => session.id)
    const disputes = await listTalentExplainabilityDisputes(sessionIds, trx)
    const ratings = await listTalentExplainabilityRatings(sessionIds, trx)
    const revision = await getTalentExplainabilitySourceRevision(trx)
    return { sessions, disputes, ratings, revision }
  }
}
