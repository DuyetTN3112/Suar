import db from '@adonisjs/lucid/services/db'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import PersistedDataIntegrityException from '#modules/errors/public_contracts/persisted_data_integrity_exception'
import {
  stageDomainEvent,
  type ReviewConfirmedAccomplishmentProjectionIdentity,
} from '#modules/events/public_contracts/domain_event_outbox'
import type {
  ReviewConfirmationAuditWrite,
  ReviewConfirmationDisputePersistenceSession,
  ReviewConfirmationDisputeUnitOfWork,
  ReviewDisputeInsert,
  ReviewSessionStateWrite,
} from '#modules/reviews/actions/ports/outbound/review_confirmation_dispute_unit_of_work'
import {
  lockClassicReviewAssignmentGovernance,
  lockClassicReviewAssignmentGovernanceByAssignmentId,
  lockClassicReviewSessionGovernance,
} from '#modules/reviews/infra/adapters/review-core/lucid_classic_review_governance_lock'
import { verifyLinkedReviewEvidenceForSession } from '#modules/reviews/infra/adapters/review-core/lucid_review_evidence_verifier'
import { stageTalentExplainabilityProjectionV1 } from '#modules/reviews/infra/adapters/self-assessment/lucid_talent_explainability_projection_stager'
import { lockTaskReviewWorkflowGovernance } from '#modules/reviews/infra/adapters/task-review/lucid_task_review_workflow_governance_lock'
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

interface TaskReviewDecisionWrite {
  reviewMessageId: string
  decision: 'accepted' | 'rejected'
  decidedAt: Date
}

interface ReviewerAgreementWrite {
  reviewMessageId: string
  agreedAt: Date
}

interface TaskReviewWorkflowStatusWrite {
  workflowId: string
  status: string
  updatedAt: Date
}

interface TaskReviewWorkflowAcceptanceWrite {
  workflowId: string
  actorId: string
  status: string
  messageBody: string
  acceptedAt: Date
}

function parseConfirmations(value: ReviewSessionRow['confirmations']): ReviewConfirmationEntry[] {
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

export default class LucidReviewConfirmationDisputeUnitOfWork implements ReviewConfirmationDisputeUnitOfWork {
  run<T>(work: (session: ReviewConfirmationDisputePersistenceSession) => Promise<T>): Promise<T> {
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
        loadSessionForUpdate: async (reviewSessionId) => {
          const governance = await lockClassicReviewSessionGovernance(transaction, reviewSessionId)
          if (!governance) return null
          const snapshot = await loadSession(
            transaction.from('review_sessions').where('id', reviewSessionId)
          )
          if (
            !snapshot ||
            snapshot.taskAssignmentId !== governance.assignmentId ||
            snapshot.revieweeId !== governance.revieweeId
          ) {
            throw new PersistedDataIntegrityException(
              'Review confirmation session crossed its locked task-assignment boundary',
              {
                reviewSessionId,
                expectedAssignmentId: governance.assignmentId,
                expectedRevieweeId: governance.revieweeId,
                actualAssignmentId: snapshot?.taskAssignmentId ?? null,
                actualRevieweeId: snapshot?.revieweeId ?? null,
              }
            )
          }
          return snapshot
        },
        loadSessionForAssignmentForUpdate: async (taskAssignmentId, revieweeId) => {
          await lockClassicReviewAssignmentGovernanceByAssignmentId(transaction, {
            assignmentId: taskAssignmentId,
            expectedAssigneeId: revieweeId,
          })
          const snapshot = await loadSession(
            transaction
              .from('review_sessions')
              .where('task_assignment_id', taskAssignmentId)
              .where('reviewee_id', revieweeId)
          )
          return snapshot
        },
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
        createDispute: async (input: ReviewDisputeInsert) => {
          await lockClassicReviewAssignmentGovernance(transaction, {
            taskId: input.taskId,
            assignmentId: input.taskAssignmentId,
            expectedAssigneeId: input.revieweeId,
          })
          const sessionGovernance = await lockClassicReviewSessionGovernance(
            transaction,
            input.reviewSessionId
          )
          if (
            !sessionGovernance ||
            sessionGovernance.taskId !== input.taskId ||
            sessionGovernance.assignmentId !== input.taskAssignmentId ||
            sessionGovernance.revieweeId !== input.revieweeId
          ) {
            throw new PersistedDataIntegrityException(
              'Review dispute creation crossed its locked review-session boundary',
              {
                reviewSessionId: input.reviewSessionId,
                expectedTaskId: input.taskId,
                expectedAssignmentId: input.taskAssignmentId,
                expectedRevieweeId: input.revieweeId,
                actualTaskId: sessionGovernance?.taskId ?? null,
                actualAssignmentId: sessionGovernance?.assignmentId ?? null,
                actualRevieweeId: sessionGovernance?.revieweeId ?? null,
              }
            )
          }
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
        saveSessionState: async (input: ReviewSessionStateWrite) => {
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
        resolveAccomplishmentProjectionIdentity: async (reviewSessionId) => {
          const rows = (await transaction
            .from('review_observation_revisions')
            .where({
              review_session_id: reviewSessionId,
              observation_type: 'accomplishment_claim',
              governance_state: 'final',
            })
            .whereNotNull('completion_claim_id')
            .whereNotNull('finalized_at')
            .orderBy('finalized_at', 'desc')
            .orderBy('revision_number', 'desc')
            .select(
              'observation_id',
              'review_workflow_id',
              'completion_claim_id',
              'observation_fact_id',
              'revision_hash',
              'review_policy_version',
              'supersedes_observation_id'
            )) as Array<{
            observation_id: string
            review_workflow_id: string
            completion_claim_id: string | null
            observation_fact_id: string
            revision_hash: string
            review_policy_version: string
            supersedes_observation_id: string | null
          }>

          // Do not select a claim by ordering. A confirmation can contain
          // multiple claims/revisions; only an unambiguous single fact may
          // authorize accomplishment projection.
          const latestByObservation = new Map<string, (typeof rows)[number]>()
          for (const row of rows) {
            if (!latestByObservation.has(row.observation_id)) {
              latestByObservation.set(row.observation_id, row)
            }
          }
          const candidates = [...latestByObservation.values()].filter(
            (row) => row.supersedes_observation_id === null
          )
          if (candidates.length !== 1) return null
          const candidate = candidates[0]
          if (!candidate?.completion_claim_id) return null
          if (!/^sha256:[0-9a-f]{64}$/.test(candidate.revision_hash)) return null
          const nativeWorkflow = (await transaction
            .from('task_review_workflows')
            .where('id', candidate.review_workflow_id)
            .first()) as unknown as { id: string } | undefined
          if (!nativeWorkflow) return null
          return {
            reviewWorkflowId: candidate.review_workflow_id,
            completionClaimId: candidate.completion_claim_id,
            reviewFinalizedFactId: candidate.observation_fact_id,
            reviewFinalizedFactHash: candidate.revision_hash,
            projectionPolicyVersion: candidate.review_policy_version,
          } satisfies ReviewConfirmedAccomplishmentProjectionIdentity
        },
        writeAudit: async (execCtx, input: ReviewConfirmationAuditWrite) => {
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
        stageTaskReviewFinalizedEvent: async (input) => {
          await stageDomainEvent(transaction, {
            eventName: 'task-review:finalized',
            dedupeKey: `${input.workflowId}:done`,
            aggregateType: 'task_review_workflow',
            aggregateId: input.workflowId,
            payload: {
              workflowId: input.workflowId,
              taskAssignmentId: input.taskAssignmentId,
              taskId: input.taskId,
              revieweeId: input.revieweeId,
              finalizedBy: input.finalizedBy,
              finalizationSource: input.finalizationSource,
              finalizedAt: input.finalizedAt.toISOString(),
            },
          })
        },
        stageTalentProjection: (input) =>
          stageTalentExplainabilityProjectionV1({
            trx: transaction,
            ...input,
          }).then(() => undefined),
        loadTaskReviewWorkflowForUpdate: async (workflowId) => {
          const governance = await lockTaskReviewWorkflowGovernance(transaction, workflowId)
          if (!governance) return null
          const workflow = (await transaction
            .from('task_review_workflows')
            .where('id', workflowId)
            .forUpdate()
            .select(
              'id',
              'task_id',
              'task_assignment_id',
              'project_id',
              'reviewee_id',
              'status',
              'completed_review_count',
              'required_review_count'
            )
            .first()) as
            | {
                id: string
                task_id: string
                task_assignment_id: string | null
                project_id: string
                reviewee_id: string
                status: string
                completed_review_count: number | string
                required_review_count: number | string
              }
            | undefined
          return workflow
            ? {
                id: workflow.id,
                taskId: workflow.task_id,
                taskAssignmentId: workflow.task_assignment_id,
                projectId: workflow.project_id,
                revieweeId: workflow.reviewee_id,
                status: workflow.status,
                completedReviewCount: Number(workflow.completed_review_count),
                requiredReviewCount: Number(workflow.required_review_count),
              }
            : null
        },
        loadTaskReviewMessageForDecision: async (workflowId, reviewMessageId) => {
          const message = (await transaction
            .from('task_review_messages')
            .where('workflow_id', workflowId)
            .where('id', reviewMessageId)
            .where('message_type', 'review')
            .whereNull('deleted_at')
            .forUpdate()
            .select(
              'id',
              'author_id',
              'reviewee_decision',
              'requires_reviewer_confirmation',
              'reviewer_agreed_at'
            )
            .first()) as
            | {
                id: string
                author_id: string
                reviewee_decision: 'accepted' | 'rejected' | null
                requires_reviewer_confirmation: boolean
                reviewer_agreed_at: Date | string | null
              }
            | undefined
          return message
            ? {
                id: message.id,
                authorId: message.author_id,
                revieweeDecision: message.reviewee_decision,
                requiresReviewerConfirmation: message.requires_reviewer_confirmation,
                reviewerAgreedAt: message.reviewer_agreed_at,
              }
            : null
        },
        hasTaskRevieweeResponse: async (workflowId, reviewMessageId) => {
          const response = (await transaction
            .from('task_review_messages')
            .where('workflow_id', workflowId)
            .where('parent_review_message_id', reviewMessageId)
            .where('message_type', 'reviewee_response')
            .whereNull('deleted_at')
            .select('id')
            .first()) as unknown as { id: string } | undefined
          return Boolean(response)
        },
        decideTaskReviewMessage: async (input: TaskReviewDecisionWrite) => {
          const update: Record<string, unknown> = {
            reviewee_decision: input.decision,
            reviewee_decided_at: input.decidedAt,
            requires_reviewer_confirmation: true,
            updated_at: input.decidedAt,
          }
          if (input.decision === 'rejected') {
            update['reviewer_agreed_at'] = null
          }
          await transaction
            .from('task_review_messages')
            .where('id', input.reviewMessageId)
            .whereNull('deleted_at')
            .update(update)
        },
        acknowledgeReviewerAgreement: async (input: ReviewerAgreementWrite) => {
          await transaction
            .from('task_review_messages')
            .where('id', input.reviewMessageId)
            .whereNull('deleted_at')
            .update({
              reviewer_agreed_at: input.agreedAt,
              updated_at: input.agreedAt,
            })
        },
        countUnresolvedTaskReviewThreads: async (workflowId: string) => {
          const row = (await transaction
            .from('task_review_messages as review')
            .where('review.workflow_id', workflowId)
            .where('review.message_type', 'review')
            .whereNull('review.deleted_at')
            .where((query) => {
              void query
                .whereNull('reviewee_decision')
                .orWhereNot('reviewee_decision', 'accepted')
                .orWhere((unconfirmedDispute) => {
                  void unconfirmedDispute
                    .where('requires_reviewer_confirmation', true)
                    .whereNull('reviewer_agreed_at')
                })
            })
            .count('* as total')
            .first()) as { total?: string | number } | undefined
          return Number(row?.total ?? 0)
        },
        updateTaskReviewWorkflowStatus: async (input: TaskReviewWorkflowStatusWrite) => {
          await transaction.from('task_review_workflows').where('id', input.workflowId).update({
            status: input.status,
            updated_at: input.updatedAt,
          })
        },
        markTaskReviewWorkflowAccepted: async (input: TaskReviewWorkflowAcceptanceWrite) => {
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
