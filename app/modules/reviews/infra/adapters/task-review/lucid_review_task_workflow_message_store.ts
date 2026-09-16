import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import type {
  ReviewTaskWorkflowPersistenceSession,
  TaskReviewMessage,
  WithdrawnTaskReviewMessage,
} from '#modules/reviews/actions/ports/outbound/review_task_workflow_unit_of_work'

export async function findWorkflowMessage(
  transaction: TransactionClientContract,
  workflowId: string,
  messageId: string
): Promise<{
  id: string
  authorId: string
  messageType: 'review' | 'reviewee_response' | 'dispute_reply' | 'system'
  revieweeDecision: 'accepted' | 'rejected' | null
} | null> {
  const message = (await transaction
    .from('task_review_messages')
    .where('workflow_id', workflowId)
    .where('id', messageId)
    .whereNull('deleted_at')
    .select('id', 'author_id', 'message_type', 'reviewee_decision')
    .first()) as
    | {
        id: string
        author_id: string
        message_type: 'review' | 'reviewee_response' | 'dispute_reply' | 'system'
        reviewee_decision: 'accepted' | 'rejected' | null
      }
    | undefined

  return message
    ? {
        id: message.id,
        authorId: message.author_id,
        messageType: message.message_type,
        revieweeDecision: message.reviewee_decision,
      }
    : null
}

export async function hasRevieweeResponse(
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
    .first()) as { id: string } | undefined

  return Boolean(response)
}

export async function countUnrespondedReviewThreads(
  transaction: TransactionClientContract,
  workflowId: string
): Promise<number> {
  const row = (await transaction
    .from('task_review_messages as review')
    .where('review.workflow_id', workflowId)
    .where('review.message_type', 'review')
    .whereNull('review.deleted_at')
    .whereNotExists((response) => {
      void response
        .from('task_review_messages as reviewee_response')
        .whereColumn('reviewee_response.parent_review_message_id', 'review.id')
        .where('reviewee_response.message_type', 'reviewee_response')
        .whereNull('reviewee_response.deleted_at')
    })
    .count('* as total')
    .first()) as { total?: number | string } | undefined

  return Number(row?.total ?? 0)
}

export async function updateSubmittedReview(
  transaction: TransactionClientContract,
  input: {
    workflowId: string
    authorId: string
    body: string
  }
): Promise<boolean> {
  const message = (await transaction
    .from('task_review_messages')
    .where('workflow_id', input.workflowId)
    .where('author_id', input.authorId)
    .where('message_type', 'review')
    .whereNull('deleted_at')
    .orderBy('created_at', 'desc')
    .select('id', 'body', 'created_at')
    .forUpdate()
    .first()) as { id: string; body: string; created_at: Date | string } | undefined

  if (!message) return false

  const latestRevision = (await transaction
    .from('task_review_message_revisions')
    .where('message_id', message.id)
    .max('revision_number as revision_number')
    .first()) as { revision_number?: number | string | null } | undefined
  let nextRevisionNumber = Number(latestRevision?.revision_number ?? 0) + 1

  if (nextRevisionNumber === 1) {
    await transaction.table('task_review_message_revisions').insert({
      message_id: message.id,
      revision_number: 1,
      body: message.body,
      editor_id: input.authorId,
      created_at: message.created_at,
    })
    nextRevisionNumber = 2
  }

  const updatedAt = new Date()
  await transaction.table('task_review_message_revisions').insert({
    message_id: message.id,
    revision_number: nextRevisionNumber,
    body: input.body,
    editor_id: input.authorId,
    created_at: updatedAt,
  })
  await transaction
    .from('task_review_messages')
    .where('id', message.id)
    .update({ body: input.body, reviewer_agreed_at: null, updated_at: updatedAt })

  return true
}

export async function updateOwnMessage(
  transaction: TransactionClientContract,
  input: Parameters<ReviewTaskWorkflowPersistenceSession['updateOwnMessage']>[0]
): Promise<boolean> {
  const message = (await transaction
    .from('task_review_messages')
    .where('workflow_id', input.workflowId)
    .where('id', input.messageId)
    .where('author_id', input.authorId)
    .whereIn('message_type', input.messageTypes)
    .whereNull('deleted_at')
    .select('id', 'body', 'created_at')
    .forUpdate()
    .first()) as { id: string; body: string; created_at: Date | string } | undefined

  if (!message) return false

  const latestRevision = (await transaction
    .from('task_review_message_revisions')
    .where('message_id', message.id)
    .max('revision_number as revision_number')
    .first()) as { revision_number?: number | string | null } | undefined
  let nextRevisionNumber = Number(latestRevision?.revision_number ?? 0) + 1
  if (nextRevisionNumber === 1) {
    await transaction.table('task_review_message_revisions').insert({
      message_id: message.id,
      revision_number: 1,
      body: message.body,
      editor_id: input.authorId,
      created_at: message.created_at,
    })
    nextRevisionNumber = 2
  }

  const updatedAt = new Date()
  await transaction.table('task_review_message_revisions').insert({
    message_id: message.id,
    revision_number: nextRevisionNumber,
    body: input.body,
    editor_id: input.authorId,
    created_at: updatedAt,
  })
  await transaction
    .from('task_review_messages')
    .where('id', message.id)
    .update({ body: input.body, updated_at: updatedAt })
  return true
}

export async function withdrawOwnMessage(
  transaction: TransactionClientContract,
  input: Parameters<ReviewTaskWorkflowPersistenceSession['withdrawOwnMessage']>[0]
): Promise<WithdrawnTaskReviewMessage | null> {
  const message = (await transaction
    .from('task_review_messages')
    .where('workflow_id', input.workflowId)
    .where('id', input.messageId)
    .where('author_id', input.authorId)
    .whereIn('message_type', ['review', 'reviewee_response', 'dispute_reply'])
    .whereNull('deleted_at')
    .select('id', 'message_type')
    .forUpdate()
    .first()) as { id: string; message_type: TaskReviewMessage['messageType'] } | undefined

  if (!message) return null

  const messageIds =
    message.message_type === 'review'
      ? ((await transaction
          .from('task_review_messages')
          .where('workflow_id', input.workflowId)
          .where((query) => {
            void query.where('id', message.id).orWhere('parent_review_message_id', message.id)
          })
          .whereNull('deleted_at')
          .select('id')) as Array<{ id: string }>)
      : [{ id: message.id }]

  await transaction
    .from('task_review_messages')
    .whereIn(
      'id',
      messageIds.map((item) => item.id)
    )
    .update({
      deleted_at: input.withdrawnAt,
      deleted_by: input.authorId,
      updated_at: input.withdrawnAt,
    })

  if (message.message_type === 'review') {
    await transaction
      .from('task_review_reviewers')
      .where('workflow_id', input.workflowId)
      .where('reviewer_id', input.authorId)
      .update({ status: 'pending', reviewed_at: null, updated_at: input.withdrawnAt })
  }

  const messageType: TaskReviewMessage['messageType'] = message.message_type
  return { messageType }
}

export async function appendWorkflowMessage(
  transaction: TransactionClientContract,
  input: Parameters<ReviewTaskWorkflowPersistenceSession['appendMessage']>[0]
): Promise<string> {
  const createdAt = new Date()
  const [message] = (await transaction
    .table('task_review_messages')
    .insert({
      workflow_id: input.workflowId,
      author_id: input.authorId,
      message_type: input.messageType,
      body: input.body,
      ...(input.parentReviewMessageId
        ? { parent_review_message_id: input.parentReviewMessageId }
        : {}),
      created_at: createdAt,
      updated_at: createdAt,
      ...(input.metadata ? { metadata: JSON.stringify(input.metadata) } : {}),
    })
    .returning('id')) as Array<{ id: string }>

  if (input.messageType !== 'system' && message) {
    await transaction.table('task_review_message_revisions').insert({
      message_id: message.id,
      revision_number: 1,
      body: input.body,
      editor_id: input.authorId,
      created_at: createdAt,
    })
  }

  if (!message?.id) {
    throw new InvariantViolationException('Unable to persist task review message')
  }

  return message.id
}
