import db from '@adonisjs/lucid/services/db'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import type {
  ReviewDisputePersistenceSession,
  ReviewDisputeUnitOfWork,
} from '#modules/reviews/actions/ports/outbound/review_dispute_unit_of_work'
import { lockClassicReviewDisputeGovernance } from '#modules/reviews/infra/adapters/review-core/lucid_classic_review_governance_lock'
import { loadReviewDisputeAccessContext } from '#modules/reviews/infra/repositories/read/review_dispute_artifact_queries'

export default class LucidReviewDisputeUnitOfWork implements ReviewDisputeUnitOfWork {
  run<T>(work: (session: ReviewDisputePersistenceSession) => Promise<T>): Promise<T> {
    return db.transaction(async (transaction) => {
      const session: ReviewDisputePersistenceSession = {
        loadAccess: async (disputeId, actorId) => {
          await lockClassicReviewDisputeGovernance(transaction, disputeId)
          return loadReviewDisputeAccessContext(transaction, disputeId, actorId)
        },
        createComment: async (input) => {
          const [created] = (await transaction
            .table('review_dispute_comments')
            .insert({
              dispute_id: input.disputeId,
              author_id: input.authorId,
              body: input.body,
              visibility: input.visibility,
            })
            .returning('*')) as [Record<string, unknown>]

          return created
        },
        createEvidence: async (input) => {
          const [created] = (await transaction
            .table('review_dispute_evidences')
            .insert({
              dispute_id: input.disputeId,
              evidence_type: input.evidenceType,
              url: input.url,
              title: input.title,
              description: input.description,
              uploaded_by: input.actorId,
            })
            .returning('*')) as [Record<string, unknown>]

          return created
        },
        advancePendingDispute: async (disputeId) => {
          await transaction
            .from('review_disputes')
            .where('id', disputeId)
            .update({
              status: 'collecting_evidence',
              updated_at: db.raw('NOW()'),
            })
        },
        writeAudit: async (execCtx, input) => {
          await auditPublicApi.write(
            execCtx,
            {
              user_id: input.userId,
              action: input.action,
              critical: true,
              entity_type: 'review_dispute',
              entity_id: input.entityId,
              old_values: null,
              new_values: input.newValues,
            },
            transaction
          )
        },
      }

      return work(session)
    })
  }
}
