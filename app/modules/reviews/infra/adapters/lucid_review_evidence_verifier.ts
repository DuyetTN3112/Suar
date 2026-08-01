import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'

export async function verifyLinkedReviewEvidenceForSession(
  reviewSessionId: string,
  trx: TransactionClientContract
): Promise<void> {
  const linkedRows = (await trx
    .from('skill_review_evidence_links as link')
    .join('skill_reviews as review', 'review.id', 'link.skill_review_id')
    .where('review.review_session_id', reviewSessionId)
    .where('review.review_status', 'submitted')
    .whereNull('review.superseded_by')
    .where((query) => {
      void query.where('review.is_fraud', false).orWhereNull('review.is_fraud')
    })
    .distinct('link.review_evidence_id')) as Array<{ review_evidence_id: string }>

  const evidenceIds = linkedRows.map((row) => row.review_evidence_id)
  if (evidenceIds.length === 0) {
    return
  }

  await trx
    .from('review_evidences')
    .where('review_session_id', reviewSessionId)
    .whereIn('id', evidenceIds)
    .update({
      verification_status: 'verified',
      updated_at: DateTime.now().toSQL(),
    })
}
