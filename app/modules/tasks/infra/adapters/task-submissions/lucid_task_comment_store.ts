import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { TaskCompletionRepository } from '#modules/tasks/actions/ports/outbound/task_completion_repository'
import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'

function client(transaction?: TaskTransaction) {
  return (transaction as TransactionClientContract | undefined) ?? db
}

function firstRow(value: unknown): unknown {
  return Array.isArray(value) ? value[0] : undefined
}

type CompletionArgs<K extends keyof TaskCompletionRepository> = Parameters<
  TaskCompletionRepository[K]
>

export class LucidTaskCommentStore {
  async findComment(...[commentId, taskId]: CompletionArgs<'findComment'>) {
    const query = db
      .from('task_comments')
      .where('id', commentId)
      .whereNull('deleted_at')
    if (taskId) void query.where('task_id', taskId)
    return ((await query.first()) as
      | Awaited<ReturnType<TaskCompletionRepository['findComment']>>
      | undefined) ?? null
  }

  async lockComment(
    ...[commentId, transaction]: CompletionArgs<'lockComment'>
  ) {
    return (
      ((await client(transaction)
        .from('task_comments')
        .where('id', commentId)
        .whereNull('deleted_at')
        .forUpdate()
        .first()) as
        | Awaited<ReturnType<TaskCompletionRepository['lockComment']>>
        | undefined) ?? null
    )
  }

  async findParentComment(
    ...[parentCommentId, taskId, transaction]: CompletionArgs<'findParentComment'>
  ) {
    return (
      ((await client(transaction)
        .from('task_comments')
        .where('id', parentCommentId)
        .where('task_id', taskId)
        .whereNull('deleted_at')
        .first()) as
        | Awaited<ReturnType<TaskCompletionRepository['findParentComment']>>
        | undefined) ?? null
    )
  }

  async createComment(
    ...[payload, transaction]: CompletionArgs<'createComment'>
  ) {
    const created = firstRow(
      await client(transaction).table('task_comments').insert(payload).returning('*')
    )
    return created as Record<string, unknown>
  }

  async updateComment(
    ...[commentId, payload, transaction]: CompletionArgs<'updateComment'>
  ) {
    const updated = firstRow(
      await client(transaction)
        .from('task_comments')
        .where('id', commentId)
        .update(payload)
        .returning('*')
    )
    return updated as Record<string, unknown>
  }

  async softDeleteComment(
    ...[commentId, now]: CompletionArgs<'softDeleteComment'>
  ) {
    await db
      .from('task_comments')
      .where('id', commentId)
      .update({ deleted_at: now, updated_at: now })
  }

  async listCommentThreadPage(
    ...[taskId, offset, limit]: CompletionArgs<'listCommentThreadPage'>
  ) {
    const totalRow = (await db
      .from('task_comments')
      .where('task_id', taskId)
      .whereNull('deleted_at')
      .whereNull('parent_comment_id')
      .count('* as total')
      .first()) as { total?: number | string } | undefined
    const roots = (await db
      .from('task_comments')
      .where('task_id', taskId)
      .whereNull('deleted_at')
      .whereNull('parent_comment_id')
      .select('id')
      .orderBy('created_at', 'asc')
      .offset(offset)
      .limit(limit)) as Array<{ id: string }>
    if (roots.length === 0) {
      return { totalRootThreads: Number(totalRow?.total ?? 0), comments: [] }
    }
    const rootIds = roots.map((row) => row.id)
    const comments = await db
      .from('task_comments as tc')
      .join('users as author', 'author.id', 'tc.author_id')
      .where('tc.task_id', taskId)
      .whereNull('tc.deleted_at')
      .where((query) => {
        void query.whereIn('tc.id', rootIds).orWhereIn('tc.parent_comment_id', rootIds)
      })
      .select('tc.*', 'author.username as author_username')
      .orderBy('tc.created_at', 'asc')
    return { totalRootThreads: Number(totalRow?.total ?? 0), comments }
  }

  async findMentionedUsers(
    ...[organizationId, usernames, transaction]: CompletionArgs<'findMentionedUsers'>
  ) {
    if (usernames.length === 0) return []
    const placeholders = usernames.map(() => '?').join(', ')
    return (await client(transaction)
      .from('users')
      .join('organization_users', 'organization_users.user_id', 'users.id')
      .where('organization_users.organization_id', organizationId)
      .whereRaw(`LOWER(users.username) IN (${placeholders})`, usernames)
      .whereNotNull('users.username')
      .select('users.id', 'users.username')) as Array<{ id: string; username: string }>
  }

  async replaceCommentMentions(
    ...[commentId, mentionedBy, mentions, transaction]: CompletionArgs<'replaceCommentMentions'>
  ) {
    const query = client(transaction)
    await query.from('task_comment_mentions').where('task_comment_id', commentId).delete()
    if (mentions.length > 0) {
      await query.table('task_comment_mentions').insert(
        mentions.map((mention) => ({
          task_comment_id: commentId,
          mentioned_user_id: mention.userId,
          mentioned_by_user_id: mentionedBy,
          mention_token: mention.token,
        }))
      )
    }
  }

  async loadCommentMentions(
    ...[commentIds, transaction]: CompletionArgs<'loadCommentMentions'>
  ) {
    if (commentIds.length === 0) return new Map()
    const rows = (await client(transaction)
      .from('task_comment_mentions as tcm')
      .join('users as mentioned_user', 'mentioned_user.id', 'tcm.mentioned_user_id')
      .whereIn('tcm.task_comment_id', commentIds)
      .select(
        'tcm.task_comment_id',
        'tcm.mention_token',
        'mentioned_user.id as mentioned_user_id',
        'mentioned_user.username as mentioned_username'
      )) as Array<{
      task_comment_id: string
      mention_token: string
      mentioned_user_id: string
      mentioned_username: string | null
    }>
    const result = new Map<
      string,
      Array<{ userId: string; username: string; mentionToken: string }>
    >()
    for (const row of rows) {
      const items = result.get(row.task_comment_id) ?? []
      items.push({
        userId: row.mentioned_user_id,
        username: row.mentioned_username ?? row.mention_token,
        mentionToken: row.mention_token,
      })
      result.set(row.task_comment_id, items)
    }
    return result
  }
}
