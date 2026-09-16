import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import {
  listReviewerCandidates,
  listSuggestedReviewerCandidates,
} from './lucid_review_candidate_queries.js'
import { loadReportRuntimeContext } from './lucid_review_report_context_loader.js'
import {
  appendWorkflowMessage,
  countUnrespondedReviewThreads,
  findWorkflowMessage,
  hasRevieweeResponse,
  updateOwnMessage,
  updateSubmittedReview,
  withdrawOwnMessage,
} from './lucid_review_task_workflow_message_store.js'
import {
  countSubmittedReviewers,
  createWorkflowReviewers,
  findReviewer,
  listReviewerIds,
  loadTaskAssignee,
  markReviewerSubmitted,
} from './lucid_review_task_workflow_reviewer_store.js'
import { loadWorkflowSeed } from './lucid_review_task_workflow_seed_loader.js'

import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import { stageDomainEvent } from '#modules/events/public_contracts/domain_event_outbox'
import { BACKEND_NOTIFICATION_ENTITY_TYPES } from '#modules/notifications/public_contracts/notification_constants'
import type { NotificationFanoutStagerContract } from '#modules/notifications/public_contracts/notification_fanout'
import type {
  ReviewTaskReviewerSuggestion,
  ReviewTaskWorkflow,
  ReviewTaskWorkflowPersistenceSession,
  ReviewTaskWorkflowSeed,
  TaskReviewDisputeReport,
  WithdrawnTaskReviewMessage,
} from '#modules/reviews/actions/ports/outbound/review_task_workflow_unit_of_work'
import type { TaskReviewWorkflowStatus } from '#modules/reviews/domain/task-review/task_review_workflow'
import { lockTaskReviewWorkflowGovernance } from '#modules/reviews/infra/adapters/task-review/lucid_task_review_workflow_governance_lock'
import type { AiDisputeAutoQueueCapability } from '#modules/disputes/public_contracts/ai_dispute_auto_queue'

interface TaskWorkflowRow {
  id: string
  task_id: string
  task_assignment_id: string | null
  project_id: string
  organization_id: string
  reviewee_id: string | null
  status: TaskReviewWorkflowStatus
  required_review_count: number | string
}

function mapWorkflow(row: TaskWorkflowRow): ReviewTaskWorkflow {
  return {
    id: row.id,
    taskId: row.task_id,
    taskAssignmentId: row.task_assignment_id,
    projectId: row.project_id,
    organizationId: row.organization_id,
    revieweeId: row.reviewee_id,
    status: row.status,
    requiredReviewCount: Number(row.required_review_count),
  }
}

export class LucidReviewTaskWorkflowSession implements ReviewTaskWorkflowPersistenceSession {
  constructor(
    private readonly transaction: TransactionClientContract,
    private readonly notificationFanout: NotificationFanoutStagerContract,
    private readonly aiDisputeAutoQueue: AiDisputeAutoQueueCapability
  ) {}

  async findWorkflowByTaskAssignmentId(
    taskAssignmentId: string
  ): Promise<ReviewTaskWorkflow | null> {
    const workflow = (await this.transaction
      .from('task_review_workflows')
      .where('task_assignment_id', taskAssignmentId)
      .first()) as TaskWorkflowRow | undefined

    return workflow ? mapWorkflow(workflow) : null
  }

  async listNativeWorkflowsByTaskId(taskId: string): Promise<ReviewTaskWorkflow[]> {
    const workflows = (await this.transaction
      .from('task_review_workflows')
      .where('task_id', taskId)
      .whereNotNull('task_assignment_id')
      .orderBy('updated_at', 'desc')) as TaskWorkflowRow[]

    return workflows.map(mapWorkflow)
  }

  async loadWorkflow(workflowId: string): Promise<ReviewTaskWorkflow | null> {
    const governance = await lockTaskReviewWorkflowGovernance(this.transaction, workflowId)
    if (!governance) return null
    const workflow = (await this.transaction
      .from('task_review_workflows')
      .where('id', workflowId)
      .first()) as TaskWorkflowRow | undefined

    return workflow ? mapWorkflow(workflow) : null
  }

  loadWorkflowSeed(
    taskId: string,
    taskAssignmentId: string
  ): Promise<ReviewTaskWorkflowSeed | null> {
    return loadWorkflowSeed(this.transaction, taskId, taskAssignmentId)
  }

  async listReviewerCandidates(
    projectId: string,
    organizationId: string,
    excludedUserIds: readonly string[]
  ): Promise<
    Array<{ userId: string; projectRole: string | null; organizationRole: string | null }>
  > {
    return listReviewerCandidates(this.transaction, projectId, organizationId, excludedUserIds)
  }

  async listSuggestedReviewerCandidates(
    taskId: string,
    projectId: string,
    organizationId: string,
    excludedUserIds: readonly string[]
  ): Promise<ReviewTaskReviewerSuggestion[]> {
    return listSuggestedReviewerCandidates(
      this.transaction,
      taskId,
      projectId,
      organizationId,
      excludedUserIds
    )
  }

  async createWorkflow(input: {
    taskId: string
    taskAssignmentId: string
    projectId: string
    organizationId: string
    revieweeId: string | null
    requiredReviewCount: number
  }): Promise<ReviewTaskWorkflow | null> {
    const insertedRows = (await this.transaction
      .table('task_review_workflows')
      .insert({
        task_id: input.taskId,
        task_assignment_id: input.taskAssignmentId,
        project_id: input.projectId,
        organization_id: input.organizationId,
        reviewee_id: input.revieweeId,
        status: 'awaiting_review',
        required_review_count: input.requiredReviewCount,
        completed_review_count: 0,
      })
      .returning([
        'id',
        'task_id',
        'task_assignment_id',
        'project_id',
        'organization_id',
        'reviewee_id',
        'status',
        'required_review_count',
      ])) as TaskWorkflowRow[]

    return insertedRows[0] ? mapWorkflow(insertedRows[0]) : null
  }

  async createWorkflowReviewers(
    workflowId: string,
    reviewers: ReadonlyArray<{
      reviewerId: string
      role: string
      priorityRank: number
      isRequired?: boolean
    }>
  ): Promise<void> {
    return createWorkflowReviewers(this.transaction, workflowId, reviewers)
  }

  async loadTaskAssignee(taskId: string): Promise<string | null | undefined> {
    return loadTaskAssignee(this.transaction, taskId)
  }

  async findReviewer(
    workflowId: string,
    reviewerId: string
  ): Promise<{ id: string; status: string } | null> {
    return findReviewer(this.transaction, workflowId, reviewerId)
  }

  async findMessage(workflowId: string, messageId: string) {
    return findWorkflowMessage(this.transaction, workflowId, messageId)
  }

  async hasRevieweeResponse(workflowId: string, reviewMessageId: string): Promise<boolean> {
    return hasRevieweeResponse(this.transaction, workflowId, reviewMessageId)
  }

  async countUnrespondedReviewThreads(workflowId: string): Promise<number> {
    return countUnrespondedReviewThreads(this.transaction, workflowId)
  }

  async listReviewerIds(workflowId: string): Promise<string[]> {
    return listReviewerIds(this.transaction, workflowId)
  }

  async markReviewerSubmitted(reviewerId: string, reviewedAt: Date): Promise<void> {
    return markReviewerSubmitted(this.transaction, reviewerId, reviewedAt)
  }

  async updateSubmittedReview(input: {
    workflowId: string
    authorId: string
    body: string
  }): Promise<boolean> {
    return updateSubmittedReview(this.transaction, input)
  }

  async updateOwnMessage(
    input: Parameters<ReviewTaskWorkflowPersistenceSession['updateOwnMessage']>[0]
  ): Promise<boolean> {
    return updateOwnMessage(this.transaction, input)
  }

  async withdrawOwnMessage(
    input: Parameters<ReviewTaskWorkflowPersistenceSession['withdrawOwnMessage']>[0]
  ): Promise<WithdrawnTaskReviewMessage | null> {
    return withdrawOwnMessage(this.transaction, input)
  }

  async appendMessage(
    input: Parameters<ReviewTaskWorkflowPersistenceSession['appendMessage']>[0]
  ): Promise<string> {
    return appendWorkflowMessage(this.transaction, input)
  }

  async countSubmittedReviewers(workflowId: string): Promise<number> {
    return countSubmittedReviewers(this.transaction, workflowId)
  }

  async updateWorkflowProgress(
    input: Parameters<ReviewTaskWorkflowPersistenceSession['updateWorkflowProgress']>[0]
  ): Promise<void> {
    await this.transaction.from('task_review_workflows').where('id', input.workflowId).update({
      completed_review_count: input.completedReviewCount,
      status: input.status,
      updated_at: input.updatedAt,
    })
  }

  async markDisputed(workflowId: string, updatedAt: Date): Promise<void> {
    await this.transaction.from('task_review_workflows').where('id', workflowId).update({
      status: 'disputed',
      updated_at: updatedAt,
    })
  }

  loadReportRuntimeContext(
    workflowId: string,
    reporterId: string,
    report: TaskReviewDisputeReport
  ): Promise<Record<string, unknown>> {
    return loadReportRuntimeContext(this.transaction, workflowId, reporterId, report)
  }

  async markReported(
    input: Parameters<ReviewTaskWorkflowPersistenceSession['markReported']>[0]
  ): Promise<void> {
    await this.transaction
      .from('task_review_workflows')
      .where('id', input.workflowId)
      .update({
        status: 'reported',
        reported_by: input.reporterId,
        reported_at: input.reportedAt,
        runtime_context: JSON.stringify(input.runtimeContext),
        updated_at: input.reportedAt,
      })
  }

  async finalizeResolvedWorkflow(
    input: Parameters<ReviewTaskWorkflowPersistenceSession['finalizeResolvedWorkflow']>[0]
  ): Promise<void> {
    const updated = (await this.transaction
      .from('task_review_workflows')
      .where('id', input.workflowId)
      .where('status', 'resolved')
      .update({
        status: 'done',
        completed_at: input.finalizedAt,
        updated_at: input.finalizedAt,
      })) as number | readonly unknown[]
    const affectedRows = typeof updated === 'number' ? updated : updated.length
    if (affectedRows !== 1) {
      throw new InvariantViolationException('Task review workflow must be resolved before it can be finalized')
    }
    await this.appendMessage({
      workflowId: input.workflowId,
      authorId: input.actorId,
      messageType: 'system',
      body: input.messageBody,
    })
  }

  async stageTaskReviewFinalizedEvent(
    input: Parameters<ReviewTaskWorkflowPersistenceSession['stageTaskReviewFinalizedEvent']>[0]
  ): Promise<void> {
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

  async stageNotification(
    input: Parameters<ReviewTaskWorkflowPersistenceSession['stageNotification']>[0]
  ): Promise<void> {
    const recipientIds = [...new Set(input.recipientIds)].filter(
      (recipientId) => recipientId !== input.actorId
    )
    if (recipientIds.length === 0) return

    await this.notificationFanout.stage(
      {
        eventName: input.eventName,
        businessEventId: input.businessEventId,
        type: input.type,
        schemaVersion: 1,
        scope: { kind: 'organization', id: input.organizationId },
        actor: { type: 'user', id: input.actorId },
        subject: { type: BACKEND_NOTIFICATION_ENTITY_TYPES.TASK, id: input.taskId },
        parameters: input.parameters,
        occurredAt: input.occurredAt.toISOString(),
        ...(input.correlationId ? { correlationId: input.correlationId } : {}),
      },
      recipientIds,
      { trx: this.transaction, now: input.occurredAt }
    )
  }

  async stageAiDisputeAutoQueue(
    workflowId: string,
    execCtx: Parameters<ReviewTaskWorkflowPersistenceSession['stageAiDisputeAutoQueue']>[1]
  ): Promise<void> {
    await this.aiDisputeAutoQueue.stage(this.transaction, {
      sourceType: 'task_review_workflow',
      sourceId: workflowId,
      requestContext: execCtx,
    })
  }
}
