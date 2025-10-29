import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

import { omitUndefined } from '#modules/contracts/public_contracts/optional_payload'
import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { mapApiV1Pagination, wrapApiV1Data } from '#modules/http/api_v1/response_mappers'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
} from '#modules/notifications/public_contracts/notification_constants'
import { notificationPublicApi } from '#modules/notifications/public_contracts/notification_creator'
import {
  buildPaginationMeta,
  normalizePagination,
  toOffset,
} from '#modules/pagination/public_contracts/pagination_public_api'
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
} from '#modules/tasks/actions/commands/submit_task_submission_command'
import {
  assertTaskCompletionPackageAccess,
  loadTaskForCompletionPackage,
} from '#modules/tasks/actions/commands/task_completion_package_access'
import {
  loadTaskCommentMentions,
  replaceTaskCommentMentions,
  resolveTaskCommentMentions,
} from '#modules/tasks/actions/support/task_comment_mentions'
import { TASK_PAGINATION } from '#modules/tasks/application/dtos/common/task_pagination'
import { camelizeResponseValue } from '#modules/tasks/controllers/v1/support/camelize_response'
import { readAliasedInput } from '#modules/tasks/controllers/v1/support/read_aliased_input'

function readAliasedString(
  request: HttpContext['request'],
  camelCaseKey: string,
  snakeCaseKey: string
): string | undefined {
  const value = readAliasedInput(request, camelCaseKey, snakeCaseKey)
  return typeof value === 'string' ? value : undefined
}

function readAliasedNumber(
  request: HttpContext['request'],
  camelCaseKey: string,
  snakeCaseKey: string
): number | null | undefined {
  const value = readAliasedInput(request, camelCaseKey, snakeCaseKey)
  return typeof value === 'number' || value === null ? value : undefined
}

const TASK_SUBMISSION_EVIDENCE_TYPES = new Set<AddTaskSubmissionEvidenceDTO['evidence_type']>([
  'pull_request',
  'commit_link',
  'demo_recording',
  'test_report',
  'document_link',
  'screenshot',
  'metrics_screenshot',
  'deployment_link',
  'other',
])

function toOptionalStringValue(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

interface TaskCommentListRow {
  id: string
  author_id: string
  author_username: string | null
  [key: string]: unknown
}

interface UpdatedTaskCommentRow extends Record<string, unknown> {
  edited_at?: string | Date | null
  updated_at?: string | Date | null
}

function buildSubmissionDTO(ctx: HttpContext, submit: boolean): SubmitTaskSubmissionDTO {
  const body = ctx.request.only([
    'summary',
    'implementationNotes',
    'implementation_notes',
    'knownLimitations',
    'known_limitations',
    'testNotes',
    'test_notes',
    'demoUrl',
    'demo_url',
    'repositoryUrl',
    'repository_url',
    'pullRequestUrl',
    'pull_request_url',
    'evidences',
  ])

  const evidences = Array.isArray(body.evidences)
    ? body.evidences
        .filter((evidence): evidence is Record<string, unknown> => typeof evidence === 'object' && evidence !== null)
        .flatMap((evidence) => {
          const evidenceType = toOptionalStringValue(evidence['evidenceType'] ?? evidence['evidence_type'])
          const url = toOptionalStringValue(evidence['url'])

          if (!evidenceType || !TASK_SUBMISSION_EVIDENCE_TYPES.has(evidenceType as AddTaskSubmissionEvidenceDTO['evidence_type']) || !url) {
            return []
          }

          return [{
            evidence_type: evidenceType as AddTaskSubmissionEvidenceDTO['evidence_type'],
            url,
            title: toOptionalStringValue(evidence['title']),
            description: toOptionalStringValue(evidence['description']),
          }]
        })
    : []

  return {
    task_id: ctx.params['taskId'] as string,
    summary: String(body.summary ?? ''),
    implementation_notes:
      ((body.implementationNotes ?? body.implementation_notes) as string | null | undefined) ?? null,
    known_limitations:
      ((body.knownLimitations ?? body.known_limitations) as string | null | undefined) ?? null,
    test_notes: ((body.testNotes ?? body.test_notes) as string | null | undefined) ?? null,
    demo_url: ((body.demoUrl ?? body.demo_url) as string | null | undefined) ?? null,
    repository_url:
      ((body.repositoryUrl ?? body.repository_url) as string | null | undefined) ?? null,
    pull_request_url:
      ((body.pullRequestUrl ?? body.pull_request_url) as string | null | undefined) ?? null,
    submit,
    evidences,
  }
}

export default class TaskSubmissionController {
  async show(ctx: HttpContext) {
    const actionContext = actionContextFromHttp(ctx)
    const taskId = ctx.params['taskId'] as string
    const task = await loadTaskForCompletionPackage(taskId)
    await assertTaskCompletionPackageAccess(actionContext, task)

    const submission = (await db.from('task_submissions').where('task_id', taskId).first()) as Record<string, unknown> | undefined

    ctx.response.status(HttpStatus.OK).json(wrapApiV1Data(camelizeResponseValue(submission ?? null)))
  }

  async saveDraft(ctx: HttpContext) {
    const submission = await new SubmitTaskSubmissionCommand(
      actionContextFromHttp(ctx),
      notificationPublicApi
    ).execute(buildSubmissionDTO(ctx, false))

    ctx.response.status(HttpStatus.OK).json(wrapApiV1Data(camelizeResponseValue(submission)))
  }

  async submit(ctx: HttpContext) {
    const submission = await new SubmitTaskSubmissionCommand(
      actionContextFromHttp(ctx),
      notificationPublicApi
    ).execute(buildSubmissionDTO(ctx, true))

    ctx.response.status(HttpStatus.OK).json(wrapApiV1Data(camelizeResponseValue(submission)))
  }

  async lock(ctx: HttpContext) {
    const actionContext = actionContextFromHttp(ctx)
    const taskId = ctx.params['taskId'] as string
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
        updated_at: db.raw('NOW()'),
      })
      .returning('*')) as Record<string, unknown>[]

    ctx.response.status(HttpStatus.OK).json(wrapApiV1Data(camelizeResponseValue(locked)))
  }

  async listEvidences(ctx: HttpContext) {
    const submissionId = ctx.params['submissionId'] as string
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

    ctx.response.status(HttpStatus.OK).json(wrapApiV1Data(camelizeResponseValue(evidences)))
  }

  async addEvidence(ctx: HttpContext) {
    const body = ctx.request.only(['evidenceType', 'evidence_type', 'url', 'title', 'description'])
    const evidence = await new AddTaskSubmissionEvidenceCommand(actionContextFromHttp(ctx)).execute({
      submission_id: ctx.params['submissionId'] as string,
      evidence_type: (body.evidenceType ??
        body.evidence_type) as AddTaskSubmissionEvidenceDTO['evidence_type'],
      url: String(body.url ?? ''),
      title: (body.title as string | null | undefined) ?? null,
      description: (body.description as string | null | undefined) ?? null,
    })

    ctx.response.status(HttpStatus.CREATED).json(wrapApiV1Data(camelizeResponseValue(evidence)))
  }

  async deleteEvidence(ctx: HttpContext) {
    await new DeleteTaskSubmissionEvidenceCommand(actionContextFromHttp(ctx)).execute({
      evidence_id: ctx.params['evidenceId'] as string,
    })

    ctx.response.status(HttpStatus.NO_CONTENT)
  }

  async listComments(ctx: HttpContext) {
    const taskId = ctx.params['taskId'] as string
    const task = await loadTaskForCompletionPackage(taskId)
    await assertTaskCompletionPackageAccess(actionContextFromHttp(ctx), task)

    const pagination = normalizePagination(ctx.request.qs(), TASK_PAGINATION)
    const rootThreadCountRow = (await db
      .from('task_comments as tc')
      .where('tc.task_id', taskId)
      .whereNull('tc.deleted_at')
      .whereNull('tc.parent_comment_id')
      .count('* as total')
      .first()) as { total?: number | string } | undefined

    const totalRootThreads = Number(rootThreadCountRow?.total ?? 0)
    const rootRows = (await db
      .from('task_comments as tc')
      .join('users as author', 'author.id', 'tc.author_id')
      .where('tc.task_id', taskId)
      .whereNull('tc.deleted_at')
      .whereNull('tc.parent_comment_id')
      .select('tc.*', 'author.username as author_username')
      .orderBy('tc.created_at', 'asc')
      .offset(toOffset(pagination.page, pagination.perPage))
      .limit(pagination.perPage)) as TaskCommentListRow[]

    const rootCommentIds = rootRows.map((comment) => comment.id)
    const comments = rootCommentIds.length === 0
      ? []
      : ((await db
          .from('task_comments as tc')
          .join('users as author', 'author.id', 'tc.author_id')
          .where('tc.task_id', taskId)
          .whereNull('tc.deleted_at')
          .where((query) => {
            void query.whereIn('tc.id', rootCommentIds).orWhereIn('tc.parent_comment_id', rootCommentIds)
          })
          .select('tc.*', 'author.username as author_username')
          .orderBy('tc.created_at', 'asc')) as TaskCommentListRow[])

    const mentionsByCommentId = await loadTaskCommentMentions(
      comments.map((comment) => comment.id)
    )

    const enriched = comments.map((comment) => ({
      ...comment,
      mentions: mentionsByCommentId.get(comment.id) ?? [],
    }))

    ctx.response.status(HttpStatus.OK).json({
      ...wrapApiV1Data(camelizeResponseValue(enriched)),
      pagination: mapApiV1Pagination(
        {
          total: totalRootThreads,
          per_page: pagination.perPage,
          current_page: pagination.page,
          last_page: buildPaginationMeta(totalRootThreads, pagination).lastPage,
        }
      ),
    })
  }

  async createComment(ctx: HttpContext) {
    const comment = await new CreateTaskCommentCommand(actionContextFromHttp(ctx)).execute(omitUndefined({
      task_id: ctx.params['taskId'] as string,
      parent_comment_id:
        (readAliasedInput(ctx.request, 'parentCommentId', 'parent_comment_id') as
          | string
          | null
          | undefined) ?? null,
      body: (ctx.request.input('body') as string | undefined) ?? '',
      comment_type:
        (readAliasedInput(ctx.request, 'commentType', 'comment_type') as
          | CreateTaskCommentDTO['comment_type']
          | undefined) ?? 'normal',
      visibility:
        (ctx.request.input('visibility') as CreateTaskCommentDTO['visibility'] | undefined) ??
        'internal',
      review_relevance:
        readAliasedInput(ctx.request, 'reviewRelevance', 'review_relevance') as
          | boolean
          | undefined,
    }))

    const mentionsByCommentId = await loadTaskCommentMentions([comment.id])
    ctx.response.status(HttpStatus.CREATED).json(
      wrapApiV1Data(
        camelizeResponseValue({
          ...comment,
          mentions: mentionsByCommentId.get(comment.id) ?? [],
        })
      )
    )
  }

  async updateComment(ctx: HttpContext) {
    const actionContext = actionContextFromHttp(ctx)
    const body = {
      body: ctx.request.input('body') as string | undefined,
      commentType: readAliasedInput(ctx.request, 'commentType', 'comment_type') as
        | string
        | undefined,
      visibility: ctx.request.input('visibility') as string | undefined,
      reviewRelevance: readAliasedInput(ctx.request, 'reviewRelevance', 'review_relevance') as
        | boolean
        | undefined,
    }
    const comment = (await db
      .from('task_comments')
      .where('id', ctx.params['commentId'] as string)
      .where('task_id', ctx.params['taskId'] as string)
      .whereNull('deleted_at')
      .first()) as { id: string; task_id: string; author_id: string } | undefined

    if (!comment) {
      throw new NotFoundException('Task comment not found')
    }

    const task = await loadTaskForCompletionPackage(comment.task_id)
    await assertTaskCompletionPackageAccess(actionContext, task, [comment.author_id])

    if (body.body?.trim().length === 0) {
      throw new BusinessLogicException('Task comment body is required')
    }

    const existingMentionsByCommentId = await loadTaskCommentMentions([comment.id])
    const previousMentionedUserIds = new Set(
      (existingMentionsByCommentId.get(comment.id) ?? []).map((mention) => mention.userId)
    )

    const nextBody = body.body !== undefined ? body.body.trim() : null
    const mentions =
      nextBody !== null
        ? await resolveTaskCommentMentions(task.organization_id, nextBody)
        : []

    const [updated] = (await db
      .from('task_comments')
      .where('id', comment.id)
      .update({
        ...(body.body !== undefined && { body: nextBody }),
        ...(body.commentType !== undefined && { comment_type: body.commentType }),
        ...(body.visibility !== undefined && { visibility: body.visibility }),
        ...(body.reviewRelevance !== undefined && { review_relevance: body.reviewRelevance }),
        edited_at: DateTime.now().toSQL(),
        updated_at: DateTime.now().toSQL(),
      })
      .returning('*')) as UpdatedTaskCommentRow[]

    if (!updated) {
      throw new NotFoundException('Task comment not found')
    }

    if (body.body !== undefined) {
      await replaceTaskCommentMentions(
        comment.id,
        actionContext.userId,
        mentions.map((mention) => ({
          userId: mention.userId,
          token: mention.token,
        }))
      )

      for (const mention of mentions) {
        if (
          mention.userId === actionContext.userId ||
          previousMentionedUserIds.has(mention.userId)
        ) {
          continue
        }

        await notificationPublicApi.handle({
          user_id: mention.userId,
          type: BACKEND_NOTIFICATION_TYPES.TASK_MENTIONED,
          title: 'Bạn được nhắc trong thảo luận task',
          message: `@${mention.username} được nhắc trong task comment`,
          related_entity_type: BACKEND_NOTIFICATION_ENTITY_TYPES.TASK,
          related_entity_id: comment.task_id,
        })
      }
    }

    const mentionsByCommentId = await loadTaskCommentMentions([comment.id])
    const serializedUpdated = {
      ...updated,
      edited_at:
        updated.edited_at instanceof Date
          ? updated.edited_at.toISOString()
          : updated.edited_at,
      updated_at:
        updated.updated_at instanceof Date
          ? updated.updated_at.toISOString()
          : updated.updated_at,
    }
    ctx.response.status(HttpStatus.OK).json(
      wrapApiV1Data(
        camelizeResponseValue({
          ...serializedUpdated,
          mentions: mentionsByCommentId.get(comment.id) ?? [],
        })
      )
    )
  }

  async deleteComment(ctx: HttpContext) {
    await new DeleteTaskCommentCommand(actionContextFromHttp(ctx)).execute({
      comment_id: ctx.params['commentId'] as string,
    })

    ctx.response.status(HttpStatus.NO_CONTENT)
  }

  async listAttachments(ctx: HttpContext) {
    const taskId = ctx.params['taskId'] as string
    const task = await loadTaskForCompletionPackage(taskId)
    await assertTaskCompletionPackageAccess(actionContextFromHttp(ctx), task)
    const pagination = normalizePagination(ctx.request.qs(), TASK_PAGINATION)

    const totalRow = (await db
      .from('task_attachments as ta')
      .where('ta.task_id', taskId)
      .whereNull('ta.deleted_at')
      .count('* as total')
      .first()) as { total?: number | string } | undefined
    const total = Number(totalRow?.total ?? 0)
    const attachments = await db
      .from('task_attachments as ta')
      .join('users as uploader', 'uploader.id', 'ta.uploaded_by')
      .where('ta.task_id', taskId)
      .whereNull('ta.deleted_at')
      .select('ta.*', 'uploader.username as uploaded_by_username')
      .orderBy('created_at', 'desc')
      .offset(toOffset(pagination.page, pagination.perPage))
      .limit(pagination.perPage)

    ctx.response.status(HttpStatus.OK).json({
      ...wrapApiV1Data(camelizeResponseValue(attachments)),
      pagination: mapApiV1Pagination({
        total,
        per_page: pagination.perPage,
        current_page: pagination.page,
        last_page: buildPaginationMeta(total, pagination).lastPage,
      }),
    })
  }

  async createAttachment(ctx: HttpContext) {
    const attachment = await new CreateTaskAttachmentCommand(actionContextFromHttp(ctx)).execute({
      task_id: ctx.params['taskId'] as string,
      file_name: readAliasedString(ctx.request, 'fileName', 'file_name') ?? '',
      file_path: readAliasedString(ctx.request, 'filePath', 'file_path') ?? '',
      file_size: readAliasedNumber(ctx.request, 'fileSize', 'file_size') ?? null,
      mime_type: readAliasedString(ctx.request, 'mimeType', 'mime_type') ?? null,
      attachment_type:
        (readAliasedInput(ctx.request, 'attachmentType', 'attachment_type') as
          CreateTaskAttachmentDTO['attachment_type'] | undefined) ?? 'other',
    })

    ctx.response.status(HttpStatus.CREATED).json(wrapApiV1Data(camelizeResponseValue(attachment)))
  }

  async deleteAttachment(ctx: HttpContext) {
    await new DeleteTaskAttachmentCommand(actionContextFromHttp(ctx)).execute({
      attachment_id: ctx.params['attachmentId'] as string,
    })

    ctx.response.status(HttpStatus.NO_CONTENT)
  }
}
