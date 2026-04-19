import db from '@adonisjs/lucid/services/db'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { stageDomainEvent } from '#modules/events/public_contracts/domain_event_outbox'
import type {
  ReviewConfirmationDisputePersistenceSession,
  ReviewConfirmationDisputeUnitOfWork,
} from '#modules/reviews/actions/ports/outbound/review_confirmation_dispute_unit_of_work'
import { verifyLinkedReviewEvidenceForSession } from '#modules/reviews/infra/adapters/lucid_review_evidence_verifier'
import { stageTalentExplainabilityProjectionV1 } from '#modules/reviews/infra/adapters/lucid_talent_explainability_projection_stager'
import type { ReviewSessionStatus } from '#modules/reviews/public_contracts/review_constants'
import type { ReviewConfirmationEntry } from '#modules/reviews/types/review_confirmation_entry'

interface ReviewSessionRow {
  id: string
  task_assignment_id: string
  reviewee_id: string
  status: ReviewSessionStatus
  completed_at: Date | string | null
  confirmations: ReviewConfirmationEntry[] | string | null
  creator_review_completed: boolean
  manager_reviews_count: number | string
  peer_reviews_count: number | string
  required_total_reviews: number | string
  minimum_manager_reviews: number | string
  minimum_peer_reviews: number | string
}

function parseConfirmations(
  value: ReviewSessionRow['confirmations']
): ReviewConfirmationEntry[] {
  if (!value) return []
  return typeof value === 'string' ? (JSON.parse(value) as ReviewConfirmationEntry[]) : value
}

function toSessionSnapshot(row: ReviewSessionRow) {
  return {
    id: row.id,
    taskAssignmentId: row.task_assignment_id,
    revieweeId: row.reviewee_id,
    status: row.status,
    completedAt: row.completed_at,
    confirmations: parseConfirmations(row.confirmations),
    creatorReviewCompleted: row.creator_review_completed,
    managerReviewsCount: Number(row.manager_reviews_count),
    peerReviewsCount: Number(row.peer_reviews_count),
    requiredTotalReviews: Number(row.required_total_reviews),
    minimumManagerReviews: Number(row.minimum_manager_reviews),
    minimumPeerReviews: Number(row.minimum_peer_reviews),
  }
}

export default class LucidReviewConfirmationDisputeUnitOfWork
  implements ReviewConfirmationDisputeUnitOfWork
{
  run<T>(
    work: (session: ReviewConfirmationDisputePersistenceSession) => Promise<T>
  ): Promise<T> {
    return db.transaction(async (transaction) => {
      const loadSession = async (
        query: ReturnType<typeof transaction.from>
      ): Promise<ReturnType<typeof toSessionSnapshot> | null> => {
        const row = (await query
          .forUpdate()
          .select(
            'id',
            'task_assignment_id',
            'reviewee_id',
            'status',
            'completed_at',
            'confirmations',
            'creator_review_completed',
            'manager_reviews_count',
            'peer_reviews_count',
            'required_total_reviews',
            'minimum_manager_reviews',
            'minimum_peer_reviews'
          )
          .first()) as ReviewSessionRow | undefined
        return row ? toSessionSnapshot(row) : null
      }

      const session: ReviewConfirmationDisputePersistenceSession = {
        loadSessionForUpdate: (reviewSessionId) =>
          loadSession(transaction.from('review_sessions').where('id', reviewSessionId)),
        loadSessionForAssignmentForUpdate: (taskAssignmentId, revieweeId) =>
          loadSession(
            transaction
              .from('review_sessions')
              .where('task_assignment_id', taskAssignmentId)
              .where('reviewee_id', revieweeId)
          ),
        loadAssignment: async (taskAssignmentId) => {
          const assignment = (await transaction
            .from('task_assignments')
            .where('id', taskAssignmentId)
            .select('id', 'task_id')
            .first()) as { id: string; task_id: string } | undefined
          return assignment ? { id: assignment.id, taskId: assignment.task_id } : null
        },
        findLatestCompletedAssignment: async (taskId, assigneeId) => {
          const assignment = (await transaction
            .from('task_assignments')
            .where('task_id', taskId)
            .where('assignee_id', assigneeId)
            .where('assignment_status', 'completed')
            .orderBy('completed_at', 'desc')
            .select('id', 'task_id')
            .first()) as { id: string; task_id: string } | undefined
          return assignment ? { id: assignment.id, taskId: assignment.task_id } : null
        },
        listDisputeStatuses: async (reviewSessionId) => {
          const rows = (await transaction
            .from('review_disputes')
            .where('review_session_id', reviewSessionId)
            .select('status')) as Array<{ status: string }>
          return rows.map((row) => row.status)
        },
        createDispute: async (input) => {
          const [created] = (await transaction
            .table('review_disputes')
            .insert({
              review_session_id: input.reviewSessionId,
              task_assignment_id: input.taskAssignmentId,
              task_id: input.taskId,
              reviewee_id: input.revieweeId,
              opened_by: input.openedBy,
              status: input.status,
              dispute_reason: input.disputeReason,
              disputed_dimensions: JSON.stringify(input.disputedDimensions ?? {}),
              disputed_skill_reviews: JSON.stringify(input.disputedSkillReviews ?? []),
              requested_outcome: input.requestedOutcome,
            })
            .returning('*')) as [Record<string, unknown>]
          return created
        },
        saveSessionState: async (input) => {
          await transaction
            .from('review_sessions')
            .where('id', input.reviewSessionId)
            .update({
              status: input.status,
              confirmations: JSON.stringify(input.confirmations),
              updated_at: input.updatedAt,
            })
        },
        listReviewerIds: async (reviewSessionId, submittedOnly) => {
          const query = transaction
            .from('skill_reviews')
            .where('review_session_id', reviewSessionId)
            .select('reviewer_id')
          if (submittedOnly) {
            void query.where('review_status', 'submitted')
          }
          const rows = (await query) as Array<{ reviewer_id: string }>
          return rows.map((row) => row.reviewer_id)
        },
        verifyLinkedEvidence: (reviewSessionId) =>
          verifyLinkedReviewEvidenceForSession(reviewSessionId, transaction),
        writeAudit: async (execCtx, input) => {
          await auditPublicApi.write(
            execCtx,
            {
              user_id: input.userId,
              action: input.action,
              critical: true,
              entity_type: input.entityType,
              entity_id: input.entityId,
              old_values: null,
              new_values: input.newValues,
            },
            transaction
          )
        },
        stageReviewConfirmedEvent: async (input) => {
          await stageDomainEvent(transaction, {
            eventName: 'review:confirmed',
            dedupeKey: input.confirmationId,
            aggregateType: 'review_session',
            aggregateId: input.reviewSessionId,
            payload: input,
          })
        },
        stageTalentProjection: (input) =>
          stageTalentExplainabilityProjectionV1({
            trx: transaction,
            ...input,
          }).then(() => undefined),
        loadTaskReviewWorkflowForUpdate: async (workflowId) => {
          const workflow = (await transaction
            .from('task_review_workflows')
            .where('id', workflowId)
            .forUpdate()
            .select(
              'id',
              'task_id',
              'project_id',
              'reviewee_id',
              'completed_review_count',
              'required_review_count'
            )
            .first()) as
            | {
                id: string
                task_id: string
                project_id: string
                reviewee_id: string
                completed_review_count: number | string
                required_review_count: number | string
              }
            | undefined
          return workflow
            ? {
                id: workflow.id,
                taskId: workflow.task_id,
                projectId: workflow.project_id,
                revieweeId: workflow.reviewee_id,
                completedReviewCount: Number(workflow.completed_review_count),
                requiredReviewCount: Number(workflow.required_review_count),
              }
            : null
        },
        markTaskReviewWorkflowAccepted: async (input) => {
          await transaction.from('task_review_workflows').where('id', input.workflowId).update({
            status: input.status,
            accepted_by_reviewee_at: input.acceptedAt,
            completed_at: input.acceptedAt,
            updated_at: input.acceptedAt,
          })
          await transaction.table('task_review_messages').insert({
            workflow_id: input.workflowId,
            author_id: input.actorId,
            message_type: 'system',
            body: input.messageBody,
          })
        },
      }

      return work(session)
    })
  }
}
