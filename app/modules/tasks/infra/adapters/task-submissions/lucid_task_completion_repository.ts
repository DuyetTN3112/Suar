import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { TaskCompletionRepository } from '#modules/tasks/actions/ports/outbound/task_completion_repository'
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

export class LucidTaskCompletionRepository extends TaskCompletionRepository {
  async findAccessTask(...[taskId]: CompletionArgs<'findAccessTask'>) {
    return (
      ((await db
        .from('tasks')
        .where('id', taskId)
        .whereNull('deleted_at')
        .select(
          'id',
          'organization_id',
          'creator_id',
          'assigned_to',
          'project_id',
          'task_visibility'
        )
        .first()) as Awaited<ReturnType<TaskCompletionRepository['findAccessTask']>>) ??
      null
    )
  }

  async lockSubmissionTask(
    ...[taskId, transaction]: CompletionArgs<'lockSubmissionTask'>
  ) {
    return (
      ((await client(transaction)
        .from('tasks')
        .where('id', taskId)
        .whereNull('deleted_at')
        .forUpdate()
        .first()) as Awaited<
        ReturnType<TaskCompletionRepository['lockSubmissionTask']>
      >) ?? null
    )
  }

  async lockActiveAssignment(
    ...[taskId, transaction]: CompletionArgs<'lockActiveAssignment'>
  ) {
    return (
      ((await client(transaction)
        .from('task_assignments')
        .where('task_id', taskId)
        .where('assignment_status', 'active')
        .forUpdate()
        .first()) as Awaited<
        ReturnType<TaskCompletionRepository['lockActiveAssignment']>
      >) ?? null
    )
  }

  async lockSubmissionByAssignment(
    ...[assignmentId, transaction]: CompletionArgs<'lockSubmissionByAssignment'>
  ) {
    return (
      ((await client(transaction)
        .from('task_submissions')
        .where('task_assignment_id', assignmentId)
        .orderBy('created_at', 'desc')
        .orderBy('id', 'desc')
        .forUpdate()
        .first()) as Awaited<
        ReturnType<TaskCompletionRepository['lockSubmissionByAssignment']>
      >) ?? null
    )
  }

  async upsertSubmission(
    ...[existingId, payload, now, transaction]: CompletionArgs<'upsertSubmission'>
  ) {
    const query = client(transaction)
    if (existingId) {
      const updated = firstRow(
        await query
          .from('task_submissions')
          .where('id', existingId)
          .update({ ...payload, updated_at: now })
          .returning('*')
      )
      return updated as Awaited<
        ReturnType<TaskCompletionRepository['upsertSubmission']>
      >
    }
    const created = firstRow(
      await query.table('task_submissions').insert(payload).returning('*')
    )
    return created as Awaited<
      ReturnType<TaskCompletionRepository['upsertSubmission']>
    >
  }

  async replaceSubmissionEvidences(
    ...[submissionId, evidences, transaction]: CompletionArgs<'replaceSubmissionEvidences'>
  ) {
    const query = client(transaction)
    await query
      .from('task_submission_evidences')
      .where('submission_id', submissionId)
      .delete()
    if (evidences.length > 0) {
      await query.table('task_submission_evidences').insert(evidences)
    }
  }

  async assignmentSnapshotExists(
    ...[assignmentId, reason, transaction]: CompletionArgs<'assignmentSnapshotExists'>
  ) {
    const row: unknown = await client(transaction)
      .from('task_assignment_snapshots')
      .where('task_assignment_id', assignmentId)
      .where('snapshot_reason', reason)
      .first()
    return Boolean(row)
  }

  listRequiredSkillSnapshots(
    ...[taskId, transaction]: CompletionArgs<'listRequiredSkillSnapshots'>
  ) {
    return client(transaction).from('task_required_skills').where('task_id', taskId).select('*')
  }

  async createAssignmentSnapshot(
    ...[payload, transaction]: CompletionArgs<'createAssignmentSnapshot'>
  ) {
    const created = firstRow(
      await client(transaction)
        .table('task_assignment_snapshots')
        .insert(payload)
        .returning('*')
    )
    return created as Record<string, unknown>
  }

  async findSubmissionByTask(
    ...[taskId]: CompletionArgs<'findSubmissionByTask'>
  ) {
    return (
      ((await db.from('task_submissions').where('task_id', taskId).first()) as
        | Awaited<ReturnType<TaskCompletionRepository['findSubmissionByTask']>>
        | undefined) ?? null
    )
  }

  async findSubmissionById(
    ...[submissionId]: CompletionArgs<'findSubmissionById'>
  ) {
    return (
      ((await db.from('task_submissions').where('id', submissionId).first()) as
        | Awaited<ReturnType<TaskCompletionRepository['findSubmissionById']>>
        | undefined) ?? null
    )
  }

  async lockSubmission(
    ...[submissionId, transaction]: CompletionArgs<'lockSubmission'>
  ) {
    return (
      ((await client(transaction)
        .from('task_submissions')
        .where('id', submissionId)
        .forUpdate()
        .first()) as
        | Awaited<ReturnType<TaskCompletionRepository['lockSubmission']>>
        | undefined) ?? null
    )
  }

  async lockSubmissionStatus(
    ...[submissionId, status, now, transaction]: CompletionArgs<'lockSubmissionStatus'>
  ) {
    const updated = firstRow(
      await client(transaction)
        .from('task_submissions')
        .where('id', submissionId)
        .update({ status, locked_at: now, updated_at: now })
        .returning('*')
    )
    return updated as Awaited<
      ReturnType<TaskCompletionRepository['lockSubmissionStatus']>
    >
  }

  listSubmissionEvidences(
    ...[submissionId]: CompletionArgs<'listSubmissionEvidences'>
  ) {
    return db
      .from('task_submission_evidences')
      .where('submission_id', submissionId)
      .orderBy('created_at', 'desc')
  }

  async findSubmissionEvidence(
    ...[evidenceId]: CompletionArgs<'findSubmissionEvidence'>
  ) {
    return (
      ((await db
        .from('task_submission_evidences')
        .where('id', evidenceId)
        .first()) as { submission_id: string; uploaded_by: string } | undefined) ?? null
    )
  }

  async createSubmissionEvidence(
    ...[payload]: CompletionArgs<'createSubmissionEvidence'>
  ) {
    const created = firstRow(
      await db.table('task_submission_evidences').insert(payload).returning('*')
    )
    return created as Record<string, unknown>
  }

  async deleteSubmissionEvidence(
    ...[evidenceId]: CompletionArgs<'deleteSubmissionEvidence'>
  ) {
    await db.from('task_submission_evidences').where('id', evidenceId).delete()
  }

  async findAttachment(...[attachmentId]: CompletionArgs<'findAttachment'>) {
    return (
      ((await db
        .from('task_attachments')
        .where('id', attachmentId)
        .whereNull('deleted_at')
        .first()) as { task_id: string; uploaded_by: string } | undefined) ?? null
    )
  }

  async createAttachment(...[payload]: CompletionArgs<'createAttachment'>) {
    const created = firstRow(
      await db.table('task_attachments').insert(payload).returning('*')
    )
    return created as Record<string, unknown>
  }

  async softDeleteAttachment(
    ...[attachmentId, now]: CompletionArgs<'softDeleteAttachment'>
  ) {
    await db
      .from('task_attachments')
      .where('id', attachmentId)
      .update({ deleted_at: now })
  }

  async listAttachments(
    ...[taskId, offset, limit]: CompletionArgs<'listAttachments'>
  ) {
    const totalRow = (await db
      .from('task_attachments')
      .where('task_id', taskId)
      .whereNull('deleted_at')
      .count('* as total')
      .first()) as { total?: number | string } | undefined
    const rows = await db
      .from('task_attachments as ta')
      .join('users as uploader', 'uploader.id', 'ta.uploaded_by')
      .where('ta.task_id', taskId)
      .whereNull('ta.deleted_at')
      .select('ta.*', 'uploader.username as uploaded_by_username')
      .orderBy('created_at', 'desc')
      .offset(offset)
      .limit(limit)
    return { total: Number(totalRow?.total ?? 0), rows }
  }

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
