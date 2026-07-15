import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { ReviewRelatedTaskComment } from '#modules/reviews/actions/dtos/response/review_related_task_comment'
import type { ReviewTaskCommentMentionReader } from '#modules/reviews/actions/ports/outbound/review_task_comment_mention_reader'

export interface LoadReviewTaskCommentsOptions {
  scope?: 'review_relevant' | 'all'
}

interface ReviewRelatedTaskCommentRow {
  id: string
  task_id: string
  parent_comment_id: string | null
  author_id: string
  author_username: string | null
  body: string
  comment_type: string
  visibility: string
  review_relevance: boolean
  edited_at: string | Date | null
  created_at: string | Date
  updated_at: string | Date
}

function toIsoLike(value: string | Date | null): string | null {
  if (!value) {
    return null
  }

  if (typeof value === 'string') {
    return value
  }

  return value.toISOString()
}

export async function loadReviewRelatedTaskComments(
  taskId: string | null | undefined,
  mentionReader: ReviewTaskCommentMentionReader,
  trx?: TransactionClientContract,
  options: LoadReviewTaskCommentsOptions = {}
): Promise<ReviewRelatedTaskComment[]> {
  if (!taskId) {
    return []
  }

  const client = trx ?? db
  const scope = options.scope ?? 'review_relevant'

  const query = client
    .from('task_comments as tc')
    .join('users as author', 'author.id', 'tc.author_id')
    .where('tc.task_id', taskId)
    .whereNull('tc.deleted_at')
    .select('tc.*', 'author.username as author_username')
    .orderBy('tc.created_at', 'desc')

  if (scope === 'review_relevant') {
    void query.where('tc.review_relevance', true)
  }

  const comments = (await query) as ReviewRelatedTaskCommentRow[]

  if (comments.length === 0) {
    return []
  }

  const mentionsByCommentId = await mentionReader.loadByCommentIds(
    comments.map((comment) => comment.id),
    trx
  )

  return comments.map((comment) => ({
    id: comment.id,
    taskId: comment.task_id,
    parentCommentId: comment.parent_comment_id,
    authorId: comment.author_id,
    authorUsername: comment.author_username,
    body: comment.body,
    commentType: comment.comment_type,
    visibility: comment.visibility,
    reviewRelevance: comment.review_relevance,
    editedAt: toIsoLike(comment.edited_at),
    createdAt: toIsoLike(comment.created_at) ?? new Date(0).toISOString(),
    updatedAt: toIsoLike(comment.updated_at) ?? new Date(0).toISOString(),
    mentions: mentionsByCommentId.get(comment.id) ?? [],
  }))
}
