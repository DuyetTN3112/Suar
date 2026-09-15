import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { lockTaskReviewWorkflowGovernance } from '#modules/reviews/infra/adapters/task-review/lucid_task_review_workflow_governance_lock'

export interface TaskReviewDecisionWrite {
  reviewMessageId: string
  decision: 'accepted' | 'rejected'
  decidedAt: Date
}

export interface ReviewerAgreementWrite {
  reviewMessageId: string
  agreedAt: Date
}

export interface TaskReviewWorkflowStatusWrite {
  workflowId: string
  status: string
  updatedAt: Date
}

export interface TaskReviewWorkflowAcceptanceWrite {
  workflowId: string
  actorId: string
  status: string
  messageBody: string
  acceptedAt: Date
}

export async function loadTaskReviewWorkflowForUpdate(
  transaction: TransactionClientContract,
  workflowId: string
) {
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
}

export async function loadTaskReviewMessageForDecision(
  transaction: TransactionClientContract,
  workflowId: string,
  reviewMessageId: string
) {
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
}

export async function hasTaskRevieweeResponse(
  transaction: TransactionClientContract,
  workflowId: string,
  reviewMessageId: string
): Promise<boolean> {
  const response = (await transaction
    .from('task_review_messages')
    .where('workflow_id', workflowId)
    .where('parent_review_message_id', reviewMessageId)
    .where('message_type', 'reviewee_response')
    .whereNull('deleted_at')
    .select('id')
    .first()) as unknown as { id: string } | undefined
  return Boolean(response)
}

export async function decideTaskReviewMessage(
  transaction: TransactionClientContract,
  input: TaskReviewDecisionWrite
): Promise<void> {
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
}

export async function acknowledgeReviewerAgreement(
  transaction: TransactionClientContract,
  input: ReviewerAgreementWrite
): Promise<void> {
  await transaction
    .from('task_review_messages')
    .where('id', input.reviewMessageId)
    .whereNull('deleted_at')
    .update({
      reviewer_agreed_at: input.agreedAt,
      updated_at: input.agreedAt,
    })
}

export async function countUnresolvedTaskReviewThreads(
  transaction: TransactionClientContract,
  workflowId: string
): Promise<number> {
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
}

export async function updateTaskReviewWorkflowStatus(
  transaction: TransactionClientContract,
  input: TaskReviewWorkflowStatusWrite
): Promise<void> {
  await transaction.from('task_review_workflows').where('id', input.workflowId).update({
    status: input.status,
    updated_at: input.updatedAt,
  })
}

export async function markTaskReviewWorkflowAccepted(
  transaction: TransactionClientContract,
  input: TaskReviewWorkflowAcceptanceWrite
): Promise<void> {
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
}
