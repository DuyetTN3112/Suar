import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import {
  acknowledgeReviewerAgreement,
  countUnresolvedTaskReviewThreads,
  decideTaskReviewMessage,
  hasTaskRevieweeResponse,
  loadTaskReviewMessageForDecision,
  loadTaskReviewWorkflowForUpdate,
  markTaskReviewWorkflowAccepted,
  updateTaskReviewWorkflowStatus,
  type ReviewerAgreementWrite,
  type TaskReviewDecisionWrite,
  type TaskReviewWorkflowAcceptanceWrite,
  type TaskReviewWorkflowStatusWrite,
} from './lucid_task_review_workflow_dispute_adapter.js'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import PersistedDataIntegrityException from '#modules/errors/public_contracts/persisted_data_integrity_exception'
import {
  stageDomainEvent,
  type ReviewConfirmedAccomplishmentProjectionIdentity,
} from '#modules/events/public_contracts/domain_event_outbox'
import type {
  ReviewConfirmationAuditWrite,
  ReviewConfirmationDisputePersistenceSession,
  ReviewDisputeInsert,
  ReviewSessionStateWrite,
} from '#modules/disputes/actions/ports/outbound/review_confirmation_dispute_unit_of_work'
import {
  lockClassicReviewAssignmentGovernance,
  lockClassicReviewAssignmentGovernanceByAssignmentId,
  lockClassicReviewSessionGovernance,
} from '#modules/reviews/infra/adapters/review-core/lucid_classic_review_governance_lock'
import { verifyLinkedReviewEvidenceForSession } from '#modules/reviews/infra/adapters/review-core/lucid_review_evidence_verifier'
import { stageTalentExplainabilityProjectionV1 } from '#modules/reviews/infra/adapters/self-assessment/lucid_talent_explainability_projection_stager'
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

export class LucidReviewConfirmationDisputeSession implements ReviewConfirmationDisputePersistenceSession {
  constructor(private readonly transaction: TransactionClientContract) {}

  private async loadSession(query: ReturnType<TransactionClientContract['from']>) {
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

  async loadSessionForUpdate(reviewSessionId: string) {
    const governance = await lockClassicReviewSessionGovernance(this.transaction, reviewSessionId)
    if (!governance) return null
    const snapshot = await this.loadSession(
      this.transaction.from('review_sessions').where('id', reviewSessionId)
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
  }

  async loadSessionForAssignmentForUpdate(taskAssignmentId: string, revieweeId: string) {
    await lockClassicReviewAssignmentGovernanceByAssignmentId(this.transaction, {
      assignmentId: taskAssignmentId,
      expectedAssigneeId: revieweeId,
    })
    return this.loadSession(
      this.transaction
        .from('review_sessions')
        .where('task_assignment_id', taskAssignmentId)
        .where('reviewee_id', revieweeId)
    )
  }

  async loadAssignment(taskAssignmentId: string) {
    const assignment = (await this.transaction
      .from('task_assignments')
      .where('id', taskAssignmentId)
      .select('id', 'task_id')
      .first()) as { id: string; task_id: string } | undefined
    return assignment ? { id: assignment.id, taskId: assignment.task_id } : null
  }

  async findLatestCompletedAssignment(taskId: string, assigneeId: string) {
    const assignment = (await this.transaction
      .from('task_assignments')
      .where('task_id', taskId)
      .where('assignee_id', assigneeId)
      .where('assignment_status', 'completed')
      .orderBy('completed_at', 'desc')
      .select('id', 'task_id')
      .first()) as { id: string; task_id: string } | undefined
    return assignment ? { id: assignment.id, taskId: assignment.task_id } : null
  }

  async listDisputeStatuses(reviewSessionId: string) {
    const rows = (await this.transaction
      .from('review_disputes')
      .where('review_session_id', reviewSessionId)
      .select('status')) as Array<{ status: string }>
    return rows.map((row) => row.status)
  }

  async createDispute(input: ReviewDisputeInsert) {
    await lockClassicReviewAssignmentGovernance(this.transaction, {
      taskId: input.taskId,
      assignmentId: input.taskAssignmentId,
      expectedAssigneeId: input.revieweeId,
    })
    const sessionGovernance = await lockClassicReviewSessionGovernance(
      this.transaction,
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
    const [created] = (await this.transaction
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
  }

  async saveSessionState(input: ReviewSessionStateWrite) {
    await this.transaction
      .from('review_sessions')
      .where('id', input.reviewSessionId)
      .update({
        status: input.status,
        confirmations: JSON.stringify(input.confirmations),
        updated_at: input.updatedAt,
      })
  }

  async listReviewerIds(reviewSessionId: string, submittedOnly?: boolean) {
    const query = this.transaction
      .from('skill_reviews')
      .where('review_session_id', reviewSessionId)
      .select('reviewer_id')
    if (submittedOnly) {
      void query.where('review_status', 'submitted')
    }
    const rows = (await query) as Array<{ reviewer_id: string }>
    return rows.map((row) => row.reviewer_id)
  }

  verifyLinkedEvidence(reviewSessionId: string) {
    return verifyLinkedReviewEvidenceForSession(reviewSessionId, this.transaction)
  }

  async resolveAccomplishmentProjectionIdentity(reviewSessionId: string) {
    const rows = (await this.transaction
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
    const nativeWorkflow = (await this.transaction
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
  }

  async writeAudit(
    execCtx: Parameters<ReviewConfirmationDisputePersistenceSession['writeAudit']>[0],
    input: ReviewConfirmationAuditWrite
  ) {
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
      this.transaction
    )
  }

  async stageReviewConfirmedEvent(
    input: Parameters<ReviewConfirmationDisputePersistenceSession['stageReviewConfirmedEvent']>[0]
  ) {
    await stageDomainEvent(this.transaction, {
      eventName: 'review:confirmed',
      dedupeKey: input.confirmationId,
      aggregateType: 'review_session',
      aggregateId: input.reviewSessionId,
      payload: input,
    })
  }

  async stageTaskReviewFinalizedEvent(
    input: Parameters<ReviewConfirmationDisputePersistenceSession['stageTaskReviewFinalizedEvent']>[0]
  ) {
    await stageDomainEvent(this.transaction, {
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
  }

  stageTalentProjection(
    input: Parameters<ReviewConfirmationDisputePersistenceSession['stageTalentProjection']>[0]
  ) {
    return stageTalentExplainabilityProjectionV1({
      trx: this.transaction,
      ...input,
    }).then(() => undefined)
  }

  loadTaskReviewWorkflowForUpdate(workflowId: string) {
    return loadTaskReviewWorkflowForUpdate(this.transaction, workflowId)
  }

  loadTaskReviewMessageForDecision(workflowId: string, reviewMessageId: string) {
    return loadTaskReviewMessageForDecision(this.transaction, workflowId, reviewMessageId)
  }

  hasTaskRevieweeResponse(workflowId: string, reviewMessageId: string) {
    return hasTaskRevieweeResponse(this.transaction, workflowId, reviewMessageId)
  }

  decideTaskReviewMessage(input: TaskReviewDecisionWrite) {
    return decideTaskReviewMessage(this.transaction, input)
  }

  acknowledgeReviewerAgreement(input: ReviewerAgreementWrite) {
    return acknowledgeReviewerAgreement(this.transaction, input)
  }

  countUnresolvedTaskReviewThreads(workflowId: string) {
    return countUnresolvedTaskReviewThreads(this.transaction, workflowId)
  }

  updateTaskReviewWorkflowStatus(input: TaskReviewWorkflowStatusWrite) {
    return updateTaskReviewWorkflowStatus(this.transaction, input)
  }

  markTaskReviewWorkflowAccepted(input: TaskReviewWorkflowAcceptanceWrite) {
    return markTaskReviewWorkflowAccepted(this.transaction, input)
  }
}
