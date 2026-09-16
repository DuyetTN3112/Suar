import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { loadReportRuntimeContext } from './lucid_review_sprint_reverse_report_context_reader.js'

import type { NotificationFanoutStagerContract } from '#modules/notifications/public_contracts/notification_fanout'
import type {
  ReviewSprintReverseWorkflow,
  ReviewSprintReverseWorkflowPersistenceSession,
} from '#modules/reviews/actions/ports/outbound/review_sprint_reverse_workflow_unit_of_work'
import type { AiDisputeAutoQueueCapability } from '#modules/disputes/public_contracts/ai_dispute_auto_queue'

interface WorkflowRow {
  id: string
  sprint_id: string
  project_id: string
  organization_id: string
  reviewer_id: string
  target_type: 'assigner' | 'environment'
  target_user_id: string | null
  target_entity_id: string | null
  responder_id: string | null
  status: string
  package_id: string | null
}

function mapWorkflow(row: WorkflowRow): ReviewSprintReverseWorkflow {
  return {
    id: row.id,
    sprintId: row.sprint_id,
    projectId: row.project_id,
    organizationId: row.organization_id,
    reviewerId: row.reviewer_id,
    targetType: row.target_type,
    targetUserId: row.target_user_id,
    targetEntityId: row.target_entity_id,
    responderId: row.responder_id,
    status: row.status,
    packageId: row.package_id,
  }
}

export class LucidReviewSprintReverseWorkflowSession
  implements ReviewSprintReverseWorkflowPersistenceSession
{
  constructor(
    private readonly transaction: TransactionClientContract,
    private readonly notificationFanout: NotificationFanoutStagerContract,
    private readonly aiDisputeAutoQueue: AiDisputeAutoQueueCapability
  ) {}

  async loadWorkflowForUpdate(workflowId: string): Promise<ReviewSprintReverseWorkflow | null> {
    const workflow = (await this.transaction
      .from('sprint_reverse_review_workflows')
      .where('id', workflowId)
      .forUpdate()
      .first()) as WorkflowRow | undefined

    return workflow ? mapWorkflow(workflow) : null
  }

  async markAccepted(workflowId: string, acceptedAt: Date): Promise<void> {
    await this.transaction.from('sprint_reverse_review_workflows').where('id', workflowId).update({
      status: 'done',
      accepted_at: acceptedAt,
      updated_at: acceptedAt,
    })
  }

  async markDisputed(workflowId: string, updatedAt: Date): Promise<void> {
    await this.transaction.from('sprint_reverse_review_workflows').where('id', workflowId).update({
      status: 'disputed',
      updated_at: updatedAt,
    })
  }

  async markReported(workflowId: string, reportedAt: Date): Promise<void> {
    await this.transaction.from('sprint_reverse_review_workflows').where('id', workflowId).update({
      status: 'reported',
      reported_at: reportedAt,
      updated_at: reportedAt,
    })
  }

  async markSubmitted(
    workflowId: string,
    rating: number,
    comment: string,
    submittedAt: Date
  ): Promise<void> {
    await this.transaction.from('sprint_reverse_review_workflows').where('id', workflowId).update({
      status: 'awaiting_response',
      rating,
      comment,
      submitted_at: submittedAt,
      updated_at: submittedAt,
    })
  }

  async appendMessage(
    input: Parameters<ReviewSprintReverseWorkflowPersistenceSession['appendMessage']>[0]
  ): Promise<void> {
    await this.transaction.table('sprint_reverse_review_messages').insert({
      id: input.id,
      workflow_id: input.workflowId,
      author_id: input.authorId,
      message_type: input.messageType,
      body: input.body,
      metadata: JSON.stringify(input.metadata),
      created_at: input.createdAt,
    })
  }

  async createManagerReview(
    input: Parameters<ReviewSprintReverseWorkflowPersistenceSession['createManagerReview']>[0]
  ): Promise<void> {
    await this.transaction.table('sprint_manager_reviews').insert({
      id: input.id,
      package_id: input.packageId,
      target_user_id: input.targetUserId,
      target_role: 'assigner',
      rating: input.rating,
      dimensions: JSON.stringify(null),
      comment: input.comment,
      is_anonymous_to_target: true,
      created_at: input.createdAt,
      updated_at: input.createdAt,
    })
  }

  async createEnvironmentReview(
    input: Parameters<ReviewSprintReverseWorkflowPersistenceSession['createEnvironmentReview']>[0]
  ): Promise<void> {
    await this.transaction.table('sprint_environment_reviews').insert({
      id: input.id,
      package_id: input.packageId,
      target_type: 'organization',
      target_id: input.organizationId,
      rating: input.rating,
      dimensions: JSON.stringify(null),
      comment: input.comment,
      is_anonymous_publicly: true,
      created_at: input.createdAt,
      updated_at: input.createdAt,
    })
  }

  loadReportRuntimeContext(
    workflow: ReviewSprintReverseWorkflow
  ): Promise<Record<string, unknown>> {
    return loadReportRuntimeContext(this.transaction, workflow)
  }

  async stageNotification(
    input: Parameters<ReviewSprintReverseWorkflowPersistenceSession['stageNotification']>[0]
  ): Promise<void> {
    await this.notificationFanout.stage(
      {
        eventName: input.eventName,
        businessEventId: input.businessEventId,
        schemaVersion: 1,
        type: input.type,
        scope: input.scope,
        actor: input.actor,
        subject: input.subject,
        parameters: input.parameters,
        occurredAt: input.occurredAt,
        correlationId: input.correlationId,
      },
      input.recipientIds,
      { trx: this.transaction, now: input.now }
    )
  }

  async stageAiDisputeAutoQueue(
    workflow: ReviewSprintReverseWorkflow,
    execCtx: Parameters<ReviewSprintReverseWorkflowPersistenceSession['stageAiDisputeAutoQueue']>[1]
  ): Promise<void> {
    await this.aiDisputeAutoQueue.stage(this.transaction, {
      sourceType: 'sprint_reverse_review_workflow',
      sourceId: workflow.id,
      requestContext: {
        ...execCtx,
        organizationId: workflow.organizationId,
      },
    })
  }
}
