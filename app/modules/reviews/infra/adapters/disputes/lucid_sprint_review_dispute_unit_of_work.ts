import db from '@adonisjs/lucid/services/db'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import type {
  SprintReviewDisputePersistenceSession,
  SprintReviewDisputeUnitOfWork,
} from '#modules/reviews/actions/ports/outbound/sprint_review_dispute_unit_of_work'
import {
  loadSprintReviewDisputeAccessContext,
  loadSprintReviewDisputeComments,
  loadSprintReviewDisputeDetail,
} from '#modules/reviews/infra/repositories/read/sprint_review_dispute_queries'
import { loadSprintReviewDisputeRuntimeContext } from '#modules/reviews/infra/repositories/read/sprint_review_dispute_runtime_context_queries'
import { aiDisputeAutoQueuePublicApi } from '#modules/reviews/public_contracts/ai_dispute_auto_queue'

export default class LucidSprintReviewDisputeUnitOfWork implements SprintReviewDisputeUnitOfWork {
  run<T>(work: (session: SprintReviewDisputePersistenceSession) => Promise<T>): Promise<T> {
    return db.transaction(async (transaction) => {
      const session: SprintReviewDisputePersistenceSession = {
        loadPackageForUpdate: async (packageId) => {
          const reviewPackage = (await transaction
            .from('sprint_review_packages')
            .where('id', packageId)
            .forUpdate()
            .first()) as
            | { id: string; reviewer_id: string; status: string }
            | undefined
          return reviewPackage ?? null
        },
        findByPackageId: async (packageId) => {
          const dispute = (await transaction
            .from('sprint_review_disputes')
            .where('package_id', packageId)
            .select('id')
            .first()) as { id: string } | undefined
          return dispute ?? null
        },
        createDispute: async (input) => {
          const [created] = (await transaction
            .table('sprint_review_disputes')
            .insert({
              id: input.id,
              package_id: input.packageId,
              opened_by: input.openedBy,
              status: 'pending',
              dispute_reason: input.disputeReason,
              dispute_review_type: input.disputeReviewType,
              requested_outcome: input.requestedOutcome,
              created_at: db.raw('NOW()'),
              updated_at: db.raw('NOW()'),
            })
            .returning('*')) as Record<string, unknown>[]
          return created ?? {}
        },
        loadAccess: (disputeId, actorId) =>
          loadSprintReviewDisputeAccessContext(transaction, disputeId, actorId),
        listComments: (disputeId) => loadSprintReviewDisputeComments(transaction, disputeId),
        loadDetail: (disputeId) => loadSprintReviewDisputeDetail(transaction, disputeId),
        loadRuntimeContext: (disputeId, counterpartyFallbackId) =>
          loadSprintReviewDisputeRuntimeContext(transaction, disputeId, counterpartyFallbackId),
        createComment: async (input) => {
          const [created] = (await transaction
            .table('sprint_review_dispute_comments')
            .insert({
              id: input.id,
              dispute_id: input.disputeId,
              author_id: input.authorId,
              body: input.body,
              visibility: input.visibility,
              created_at: db.raw('NOW()'),
              updated_at: db.raw('NOW()'),
            })
            .returning('*')) as Record<string, unknown>[]

          return created ?? {}
        },
        report: async (input) => {
          await transaction
            .from('sprint_review_disputes')
            .where('id', input.disputeId)
            .update({
              status: 'admin_reviewing',
              reported_to_admin_at: db.raw('NOW()'),
              reported_to_admin_by: input.actorId,
              escalation_reason: input.escalationReason,
              runtime_context: JSON.stringify(input.runtimeContext),
              updated_at: db.raw('NOW()'),
            })
        },
        writeAudit: async (execCtx, input) => {
          await auditPublicApi.write(
            execCtx,
            {
              action: input.action,
              critical: true,
              entity_type: 'sprint_review_dispute',
              entity_id: input.entityId,
              new_values: input.newValues,
            },
            transaction
          )
        },
        stageAiEvaluation: async (disputeId, execCtx) => {
          await aiDisputeAutoQueuePublicApi.stage(transaction, {
            sourceType: 'sprint_review_dispute',
            sourceId: disputeId,
            requestContext: execCtx,
          })
        },
      }

      return work(session)
    })
  }
}
