import db from '@adonisjs/lucid/services/db'

import type {
  ReviewDisputeArtifactReader,
  ReviewDisputeArtifactSnapshot,
} from '#modules/reviews/actions/ports/outbound/review_dispute_artifact_reader'
import {
  loadReviewDisputeAccessContext,
  loadReviewDisputeComments,
  loadReviewDisputeEvidences,
} from '#modules/reviews/infra/repositories/read/review_dispute_artifact_queries'

export default class LucidReviewDisputeArtifactReader implements ReviewDisputeArtifactReader {
  async listCaseFiles(disputeId: string): Promise<Record<string, unknown>[]> {
    return (await db
      .from('review_dispute_case_files')
      .where('dispute_id', disputeId)
      .orderBy('case_version', 'desc')
      .select('*')) as Record<string, unknown>[]
  }

  listComments(disputeId: string, actorId: string): Promise<ReviewDisputeArtifactSnapshot> {
    return db.transaction(async (transaction) => ({
      access: await loadReviewDisputeAccessContext(transaction, disputeId, actorId),
      items: await loadReviewDisputeComments(transaction, disputeId),
    }))
  }

  listEvidences(disputeId: string, actorId: string): Promise<ReviewDisputeArtifactSnapshot> {
    return db.transaction(async (transaction) => ({
      access: await loadReviewDisputeAccessContext(transaction, disputeId, actorId),
      items: await loadReviewDisputeEvidences(transaction, disputeId),
    }))
  }
}
