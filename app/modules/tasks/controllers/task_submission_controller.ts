import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'

import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import { notificationPublicApi } from '#modules/notifications/public_contracts/notification_creator'
import AddTaskSubmissionEvidenceCommand, {
  type AddTaskSubmissionEvidenceDTO,
} from '#modules/tasks/actions/commands/add_task_submission_evidence_command'
import CreateTaskAttachmentCommand, {
  type CreateTaskAttachmentDTO,
} from '#modules/tasks/actions/commands/create_task_attachment_command'
import CreateTaskCommentCommand, {
  type CreateTaskCommentDTO,
} from '#modules/tasks/actions/commands/create_task_comment_command'
import DeleteTaskAttachmentCommand from '#modules/tasks/actions/commands/delete_task_attachment_command'
import DeleteTaskCommentCommand from '#modules/tasks/actions/commands/delete_task_comment_command'
import DeleteTaskSubmissionEvidenceCommand from '#modules/tasks/actions/commands/delete_task_submission_evidence_command'
import SubmitTaskSubmissionCommand, {
  type SubmitTaskSubmissionDTO,
  type TaskSubmissionEvidenceInput,
} from '#modules/tasks/actions/commands/submit_task_submission_command'
import {
  assertTaskCompletionPackageAccess,
  loadTaskForCompletionPackage,
} from '#modules/tasks/actions/commands/task_completion_package_access'

function buildSubmissionDTO(ctx: HttpContext, submit: boolean): SubmitTaskSubmissionDTO {
  const body = ctx.request.only([
    'summary',
    'implementation_notes',
    'known_limitations',
    'test_notes',
    'demo_url',
    'repository_url',
    'pull_request_url',
    'evidences',
  ])

  return {
    task_id: ctx.params.id as string,
    summary: String(body.summary ?? ''),
    implementation_notes: (body.implementation_notes as string | null | undefined) ?? null,
    known_limitations: (body.known_limitations as string | null | undefined) ?? null,
    test_notes: (body.test_notes as string | null | undefined) ?? null,
    demo_url: (body.demo_url as string | null | undefined) ?? null,
    repository_url: (body.repository_url as string | null | undefined) ?? null,
    pull_request_url: (body.pull_request_url as string | null | undefined) ?? null,
    submit,
    evidences: Array.isArray(body.evidences) ? (body.evidences as TaskSubmissionEvidenceInput[]) : [],
  }
}

export default class TaskSubmissionController {
  async show(ctx: HttpContext) {
    const actionContext = actionContextFromHttp(ctx)
    const taskId = ctx.params.id as string
    const task = await loadTaskForCompletionPackage(taskId)
    await assertTaskCompletionPackageAccess(actionContext, task)

    const submission = (await db.from('task_submissions').where('task_id', taskId).first()) as Record<string, unknown> | undefined

    ctx.response.status(HttpStatus.OK).json({
      success: true,
      data: submission ?? null,
      meta: {},
    })
  }

  async saveDraft(ctx: HttpContext) {
    const submission = await new SubmitTaskSubmissionCommand(
      actionContextFromHttp(ctx),
      notificationPublicApi
    ).execute(buildSubmissionDTO(ctx, false))

    ctx.response.status(HttpStatus.OK).json({
      success: true,
      data: submission,
      meta: {},
    })
  }

  async submit(ctx: HttpContext) {
    const submission = await new SubmitTaskSubmissionCommand(
      actionContextFromHttp(ctx),
      notificationPublicApi
    ).execute(buildSubmissionDTO(ctx, true))

    ctx.response.status(HttpStatus.OK).json({
      success: true,
      data: submission,
      meta: {},
    })
  }

  async lock(ctx: HttpContext) {
    const actionContext = actionContextFromHttp(ctx)
    const taskId = ctx.params.id as string
    const task = await loadTaskForCompletionPackage(taskId)
    await assertTaskCompletionPackageAccess(actionContext, task)

    const submission = (await db.from('task_submissions').where('task_id', taskId).first()) as { id: string; status: string } | undefined
    if (!submission) {
      throw new NotFoundException('Task submission not found')
    }

    if (submission.status === 'locked') {
      throw new BusinessLogicException('Task submission is already locked')
    }

    const [locked] = (await db
      .from('task_submissions')
      .where('id', submission.id)
      .update({
        status: 'locked',
        locked_at: db.raw('NOW()'),
      })
      .returning('*')) as Record<string, unknown>[]

    ctx.response.status(HttpStatus.OK).json({
      success: true,
      data: locked,
      meta: {},
    })
  }

  async listEvidences(ctx: HttpContext) {
    const submissionId = ctx.params.submissionId as string
    const submission = (await db.from('task_submissions').where('id', submissionId).first()) as { task_id: string; submitted_by: string } | undefined
    if (!submission) {
      throw new NotFoundException('Task submission not found')
    }

    const task = await loadTaskForCompletionPackage(submission.task_id)
    await assertTaskCompletionPackageAccess(actionContextFromHttp(ctx), task, [
      submission.submitted_by,
    ])

    const evidences = await db
      .from('task_submission_evidences')
      .where('submission_id', submissionId)
      .orderBy('created_at', 'desc')

    ctx.response.status(HttpStatus.OK).json({
      success: true,
      data: evidences,
      meta: {},
    })
  }

  async addEvidence(ctx: HttpContext) {
    const body = ctx.request.only(['evidence_type', 'url', 'title', 'description'])
    const evidence = await new AddTaskSubmissionEvidenceCommand(actionContextFromHttp(ctx)).execute({
      submission_id: ctx.params.submissionId as string,
      evidence_type: body.evidence_type as AddTaskSubmissionEvidenceDTO['evidence_type'],
      url: String(body.url ?? ''),
      title: (body.title as string | null | undefined) ?? null,
      description: (body.description as string | null | undefined) ?? null,
    })

    ctx.response.status(HttpStatus.CREATED).json({
      success: true,
      data: evidence,
      meta: {},
    })
  }

  async deleteEvidence(ctx: HttpContext) {
    await new DeleteTaskSubmissionEvidenceCommand(actionContextFromHttp(ctx)).execute({
      evidence_id: ctx.params.evidenceId as string,
    })

    ctx.response.status(HttpStatus.NO_CONTENT)
  }

  async listComments(ctx: HttpContext) {
    const taskId = ctx.params.taskId as string
    const task = await loadTaskForCompletionPackage(taskId)
    await assertTaskCompletionPackageAccess(actionContextFromHttp(ctx), task)

    const comments = await db
      .from('task_comments as tc')
      .join('users as author', 'author.id', 'tc.author_id')
      .where('tc.task_id', taskId)
      .whereNull('tc.deleted_at')
      .select('tc.*', 'author.username as author_username')
      .orderBy('created_at', 'asc')

    ctx.response.status(HttpStatus.OK).json({
      success: true,
      data: comments,
      meta: {},
    })
  }

  async createComment(ctx: HttpContext) {
    const body = ctx.request.only(['parent_comment_id', 'body', 'comment_type', 'visibility'])
    const comment = await new CreateTaskCommentCommand(actionContextFromHttp(ctx)).execute({
      task_id: ctx.params.taskId as string,
      parent_comment_id: (body.parent_comment_id as string | null | undefined) ?? null,
      body: String(body.body ?? ''),
      comment_type: (body.comment_type as CreateTaskCommentDTO['comment_type'] | undefined) ?? 'normal',
      visibility: (body.visibility as CreateTaskCommentDTO['visibility'] | undefined) ?? 'internal',
    })

    ctx.response.status(HttpStatus.CREATED).json({
      success: true,
      data: comment,
      meta: {},
    })
  }

  async updateComment(ctx: HttpContext) {
    const actionContext = actionContextFromHttp(ctx)
    const body = ctx.request.only(['body', 'comment_type', 'visibility'])
    const comment = (await db
      .from('task_comments')
      .where('id', ctx.params.commentId as string)
      .where('task_id', ctx.params.taskId as string)
      .whereNull('deleted_at')
      .first()) as { id: string; task_id: string; author_id: string } | undefined

    if (!comment) {
      throw new NotFoundException('Task comment not found')
    }

    const task = await loadTaskForCompletionPackage(comment.task_id)
    await assertTaskCompletionPackageAccess(actionContext, task, [comment.author_id])

    if (body.body !== undefined && String(body.body).trim().length === 0) {
      throw new BusinessLogicException('Task comment body is required')
    }

    const [updated] = (await db
      .from('task_comments')
      .where('id', comment.id)
      .update({
        ...(body.body !== undefined && { body: String(body.body).trim() }),
        ...(body.comment_type !== undefined && { comment_type: body.comment_type as string }),
        ...(body.visibility !== undefined && { visibility: body.visibility as string }),
      })
      .returning('*')) as Record<string, unknown>[]

    ctx.response.status(HttpStatus.OK).json({
      success: true,
      data: updated,
      meta: {},
    })
  }

  async deleteComment(ctx: HttpContext) {
    await new DeleteTaskCommentCommand(actionContextFromHttp(ctx)).execute({
      comment_id: ctx.params.commentId as string,
    })

    ctx.response.status(HttpStatus.NO_CONTENT)
  }

  async listAttachments(ctx: HttpContext) {
    const taskId = ctx.params.taskId as string
    const task = await loadTaskForCompletionPackage(taskId)
    await assertTaskCompletionPackageAccess(actionContextFromHttp(ctx), task)

    const attachments = await db
      .from('task_attachments as ta')
      .join('users as uploader', 'uploader.id', 'ta.uploaded_by')
      .where('ta.task_id', taskId)
      .whereNull('ta.deleted_at')
      .select('ta.*', 'uploader.username as uploaded_by_username')
      .orderBy('created_at', 'desc')

    ctx.response.status(HttpStatus.OK).json({
      success: true,
      data: attachments,
      meta: {},
    })
  }

  async createAttachment(ctx: HttpContext) {
    const body = ctx.request.only([
      'file_name',
      'file_path',
      'file_size',
      'mime_type',
      'attachment_type',
    ])
    const attachment = await new CreateTaskAttachmentCommand(actionContextFromHttp(ctx)).execute({
      task_id: ctx.params.taskId as string,
      file_name: String(body.file_name ?? ''),
      file_path: String(body.file_path ?? ''),
      file_size: (body.file_size as number | null | undefined) ?? null,
      mime_type: (body.mime_type as string | null | undefined) ?? null,
      attachment_type: (body.attachment_type as CreateTaskAttachmentDTO['attachment_type'] | undefined) ?? 'other',
    })

    ctx.response.status(HttpStatus.CREATED).json({
      success: true,
      data: attachment,
      meta: {},
    })
  }

  async deleteAttachment(ctx: HttpContext) {
    await new DeleteTaskAttachmentCommand(actionContextFromHttp(ctx)).execute({
      attachment_id: ctx.params.attachmentId as string,
    })

    ctx.response.status(HttpStatus.NO_CONTENT)
  }
}
