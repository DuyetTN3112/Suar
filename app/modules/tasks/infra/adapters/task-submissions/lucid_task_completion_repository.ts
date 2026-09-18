import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { LucidTaskCommentStore } from './lucid_task_comment_store.js'

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

  readonly #commentStore: LucidTaskCommentStore

  constructor(commentStore: LucidTaskCommentStore = new LucidTaskCommentStore()) {
    super()
    this.#commentStore = commentStore
  }

  async findComment(...args: CompletionArgs<'findComment'>) {
    return this.#commentStore.findComment(...args)
  }

  async lockComment(...args: CompletionArgs<'lockComment'>) {
    return this.#commentStore.lockComment(...args)
  }

  async findParentComment(...args: CompletionArgs<'findParentComment'>) {
    return this.#commentStore.findParentComment(...args)
  }

  async createComment(...args: CompletionArgs<'createComment'>) {
    return this.#commentStore.createComment(...args)
  }

  async updateComment(...args: CompletionArgs<'updateComment'>) {
    return this.#commentStore.updateComment(...args)
  }

  async softDeleteComment(...args: CompletionArgs<'softDeleteComment'>) {
    return this.#commentStore.softDeleteComment(...args)
  }

  async listCommentThreadPage(...args: CompletionArgs<'listCommentThreadPage'>) {
    return this.#commentStore.listCommentThreadPage(...args)
  }

  async findMentionedUsers(...args: CompletionArgs<'findMentionedUsers'>) {
    return this.#commentStore.findMentionedUsers(...args)
  }

  async replaceCommentMentions(...args: CompletionArgs<'replaceCommentMentions'>) {
    return this.#commentStore.replaceCommentMentions(...args)
  }

  async loadCommentMentions(...args: CompletionArgs<'loadCommentMentions'>) {
    return this.#commentStore.loadCommentMentions(...args)
  }
}

