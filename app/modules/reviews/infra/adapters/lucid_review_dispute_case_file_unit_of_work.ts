import db from '@adonisjs/lucid/services/db'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import {
  notificationFanoutPublicApi,
  type NotificationFanoutStagerContract,
} from '#modules/notifications/public_contracts/notification_fanout'
import type {
  ReviewDisputeCaseFilePersistenceSession,
  ReviewDisputeCaseFileUnitOfWork,
} from '#modules/reviews/actions/ports/outbound/review_dispute_case_file_unit_of_work'
import { buildReviewDisputeCaseFileRecord } from '#modules/reviews/infra/adapters/lucid_review_dispute_case_file_builder'
import {
  aiDisputeAutoQueuePublicApi,
  type AiDisputeAutoQueueCapability,
} from '#modules/reviews/public_contracts/ai_dispute_auto_queue'

export default class LucidReviewDisputeCaseFileUnitOfWork
  implements ReviewDisputeCaseFileUnitOfWork
{
  constructor(
    private readonly notificationFanout: NotificationFanoutStagerContract = notificationFanoutPublicApi,
    private readonly aiDisputeAutoQueue: AiDisputeAutoQueueCapability = aiDisputeAutoQueuePublicApi
  ) {}

  run<T>(work: (session: ReviewDisputeCaseFilePersistenceSession) => Promise<T>): Promise<T> {
    return db.transaction(async (transaction) => {
      const session: ReviewDisputeCaseFilePersistenceSession = {
        loadDisputeForReport: async (disputeId) => {
          const dispute = (await transaction
            .from('review_disputes')
            .where('id', disputeId)
            .forUpdate()
            .first()) as
            | {
                id: string
                status: string
                reviewee_id: string
                task_id: string
                reported_to_admin_at: string | Date | null
              }
            | undefined

          return dispute
            ? {
                id: dispute.id,
                status: dispute.status,
                revieweeId: dispute.reviewee_id,
                taskId: dispute.task_id,
                reportedToAdminAt: dispute.reported_to_admin_at,
              }
            : null
        },
        loadReportTask: async (taskId) => {
          const task = (await transaction
            .from('tasks')
            .where('id', taskId)
            .select('organization_id', 'title')
            .first()) as { organization_id: string; title: string } | undefined

          return task
            ? {
                organizationId: task.organization_id,
                title: task.title,
              }
            : null
        },
        listPublicExchangeAuthorIds: async (disputeId) => {
          const rows = (await transaction
            .from('review_dispute_comments')
            .where('dispute_id', disputeId)
            .where('visibility', 'all_parties')
            .select('author_id')) as Array<{ author_id: string }>

          return rows.map((row) => row.author_id)
        },
        listAdminUserIds: async (excludedUserId) => {
          const rows = (await transaction
            .from('users')
            .whereIn('system_role', ['system_admin', 'superadmin'])
            .whereNot('id', excludedUserId)
            .select('id')) as Array<{ id: string }>

          return rows.map((row) => row.id)
        },
        transitionToAdminReviewing: async (input) => {
          await transaction.from('review_disputes').where('id', input.disputeId).update({
            status: input.status,
            reported_to_admin_at: input.now,
            reported_to_admin_by: input.actorId,
            escalation_reason: input.escalationReason,
            updated_at: input.now,
          })
        },
        buildCaseFile: (disputeId, actorId) =>
          buildReviewDisputeCaseFileRecord(transaction, disputeId, actorId),
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
        stageNotification: async (input) => {
          await this.notificationFanout.stage(
            {
              schemaVersion: 1,
              scope: { kind: 'organization', id: input.organizationId },
              actor: { type: 'user', id: input.actorId },
              subject: { type: 'task', id: input.taskId },
              eventName: input.eventName,
              businessEventId: input.businessEventId,
              type: input.type,
              parameters: input.parameters,
              occurredAt: input.occurredAt,
              ...(input.correlationId ? { correlationId: input.correlationId } : {}),
            },
            input.recipientIds,
            { trx: transaction, now: input.now }
          )
        },
        stageAiDisputeEvaluation: (disputeId, requestContext) =>
          this.aiDisputeAutoQueue.stage(transaction, {
            sourceType: 'review_dispute',
            sourceId: disputeId,
            requestContext,
          }),
      }

      return work(session)
    })
  }
}
