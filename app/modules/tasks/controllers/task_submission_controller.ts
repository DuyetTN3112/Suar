import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { omitUndefined } from '#modules/contracts/public_contracts/optional_payload'
import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { readAliasedInput } from '#modules/http/boundary/aliased_input'
import { mapApiV1Pagination, wrapApiV1Data } from '#modules/http/boundary/api_v1_response'
import { camelizeResponseValue } from '#modules/http/boundary/camelize_response'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import {
  buildPaginationMeta,
  normalizePagination,
} from '#modules/pagination/public_contracts/pagination_public_api'
import type { AddTaskSubmissionEvidenceDTO } from '#modules/tasks/actions/commands/add_task_submission_evidence_command'
import type { CreateTaskAttachmentDTO } from '#modules/tasks/actions/commands/create_task_attachment_command'
import type { CreateTaskCommentDTO } from '#modules/tasks/actions/commands/create_task_comment_command'
import type { SubmitTaskSubmissionDTO } from '#modules/tasks/actions/commands/submit_task_submission_command'
import type { UpdateTaskCommentDTO } from '#modules/tasks/actions/commands/update_task_comment_command'
import { TASK_PAGINATION } from '#modules/tasks/actions/dtos/common/task_pagination'
import { TaskCompletionApplicationFactory } from '#modules/tasks/actions/ports/inbound/task_completion_application_factory'

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

function uploadedFileMimeType(file: {
  type?: string
  subtype?: string
  headers?: Record<string, unknown>
}): string | null {
  const header = file.headers?.['content-type']
  if (typeof header === 'string' && header.trim()) {
    return header
  }
  if (file.type && file.subtype) {
    return `${file.type}/${file.subtype}`
  }
  return null
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

interface SubmissionBody extends Record<string, unknown> {
  evidences?: unknown
}

type SubmissionEvidenceInput = Omit<AddTaskSubmissionEvidenceDTO, 'submission_id'>

function readSubmissionValue(
  body: SubmissionBody,
  camelCaseKey: string,
  snakeCaseKey: string
): unknown {
  return body[camelCaseKey] ?? body[snakeCaseKey]
}

function toSubmissionEvidence(
  value: unknown
): AddTaskSubmissionEvidenceDTO['evidence_type'] | null {
  return typeof value === 'string' &&
    TASK_SUBMISSION_EVIDENCE_TYPES.has(value as AddTaskSubmissionEvidenceDTO['evidence_type'])
    ? (value as AddTaskSubmissionEvidenceDTO['evidence_type'])
    : null
}

function toOptionalString(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function toSubmissionString(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value)
  }
  return ''
}

function buildSubmissionEvidences(value: unknown): SubmissionEvidenceInput[] {
  if (!Array.isArray(value)) return []

  return value
    .filter(
      (evidence): evidence is Record<string, unknown> =>
        typeof evidence === 'object' && evidence !== null
    )
    .flatMap((evidence) => {
      const evidenceType = toSubmissionEvidence(
        evidence['evidenceType'] ?? evidence['evidence_type']
      )
      const url = toOptionalString(evidence['url'])
      if (!evidenceType || !url) return []

      return [
        {
          evidence_type: evidenceType,
          url,
          title: toOptionalString(evidence['title']),
          description: toOptionalString(evidence['description']),
        },
      ]
    })
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
  ]) as SubmissionBody

  return {
    task_id: ctx.params['taskId'] as string,
    summary: toSubmissionString(body['summary']),
    implementation_notes:
      (readSubmissionValue(body, 'implementationNotes', 'implementation_notes') as
        | string
        | null) ?? null,
    known_limitations:
      (readSubmissionValue(body, 'knownLimitations', 'known_limitations') as
        | string
        | null) ?? null,
    test_notes:
      (readSubmissionValue(body, 'testNotes', 'test_notes') as string | null) ?? null,
    demo_url: (readSubmissionValue(body, 'demoUrl', 'demo_url') as string | null) ?? null,
    repository_url:
      (readSubmissionValue(body, 'repositoryUrl', 'repository_url') as
        | string
        | null) ?? null,
    pull_request_url:
      (readSubmissionValue(body, 'pullRequestUrl', 'pull_request_url') as
        | string
        | null) ?? null,
    submit,
    evidences: buildSubmissionEvidences(body.evidences),
  }
}

function serializeDates(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      item instanceof Date ? item.toISOString() : item,
    ])
  )
}

@inject()
export default class TaskSubmissionController {
  constructor(private readonly applications: TaskCompletionApplicationFactory) {}

  async show(ctx: HttpContext) {
    const submission = await this.applications
      .makeGetSubmission(actionContextFromHttp(ctx))
      .execute(ctx.params['taskId'] as string)

    ctx.response
      .status(HttpStatus.OK)
      .json(wrapApiV1Data(camelizeResponseValue(submission)))
  }

  async saveDraft(ctx: HttpContext) {
    const submission = await this.applications
      .makeSubmitSubmission(actionContextFromHttp(ctx))
      .execute(buildSubmissionDTO(ctx, false))

    ctx.response.status(HttpStatus.OK).json(wrapApiV1Data(camelizeResponseValue(submission)))
  }

  async submit(ctx: HttpContext) {
    const submission = await this.applications
      .makeSubmitSubmission(actionContextFromHttp(ctx))
      .execute(buildSubmissionDTO(ctx, true))

    ctx.response.status(HttpStatus.OK).json(wrapApiV1Data(camelizeResponseValue(submission)))
  }

  async lock(ctx: HttpContext) {
    const submission = await this.applications
      .makeLockSubmission(actionContextFromHttp(ctx))
      .execute(ctx.params['taskId'] as string)

    ctx.response.status(HttpStatus.OK).json(wrapApiV1Data(camelizeResponseValue(submission)))
  }

  async listEvidences(ctx: HttpContext) {
    const evidences = await this.applications
      .makeListEvidences(actionContextFromHttp(ctx))
      .execute(ctx.params['submissionId'] as string)

    ctx.response.status(HttpStatus.OK).json(wrapApiV1Data(camelizeResponseValue(evidences)))
  }

  async addEvidence(ctx: HttpContext) {
    const body = ctx.request.only([
      'evidenceType',
      'evidence_type',
      'url',
      'title',
      'description',
    ])
    const evidence = await this.applications
      .makeAddEvidence(actionContextFromHttp(ctx))
      .execute({
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
    await this.applications
      .makeDeleteEvidence(actionContextFromHttp(ctx))
      .execute({ evidence_id: ctx.params['evidenceId'] as string })

    ctx.response.status(HttpStatus.NO_CONTENT)
  }

  async listComments(ctx: HttpContext) {
    const pagination = normalizePagination(ctx.request.qs(), TASK_PAGINATION)
    const result = await this.applications
      .makeListComments(actionContextFromHttp(ctx))
      .execute(
        ctx.params['taskId'] as string,
        pagination.page,
        pagination.perPage
      )

    ctx.response.status(HttpStatus.OK).json({
      ...wrapApiV1Data(camelizeResponseValue(result.comments)),
      pagination: mapApiV1Pagination({
        total: result.totalRootThreads,
        per_page: pagination.perPage,
        current_page: pagination.page,
        last_page: buildPaginationMeta(
          result.totalRootThreads,
          pagination
        ).lastPage,
      }),
    })
  }

  async createComment(ctx: HttpContext) {
    const comment = await this.applications
      .makeCreateComment(actionContextFromHttp(ctx))
      .execute(
        omitUndefined({
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
            (ctx.request.input('visibility') as
              | CreateTaskCommentDTO['visibility']
              | undefined) ?? 'internal',
          review_relevance: readAliasedInput(
            ctx.request,
            'reviewRelevance',
            'review_relevance'
          ) as boolean | undefined,
        })
      )

    ctx.response
      .status(HttpStatus.CREATED)
      .json(wrapApiV1Data(camelizeResponseValue(comment)))
  }

  async updateComment(ctx: HttpContext) {
    const update = omitUndefined({
      task_id: ctx.params['taskId'] as string,
      comment_id: ctx.params['commentId'] as string,
      body: ctx.request.input('body') as string | undefined,
      comment_type: readAliasedInput(
        ctx.request,
        'commentType',
        'comment_type'
      ) as string | undefined,
      visibility: ctx.request.input('visibility') as string | undefined,
      review_relevance: readAliasedInput(
        ctx.request,
        'reviewRelevance',
        'review_relevance'
      ) as boolean | undefined,
    }) as UpdateTaskCommentDTO
    const comment = await this.applications
      .makeUpdateComment(actionContextFromHttp(ctx))
      .execute(update)

    ctx.response
      .status(HttpStatus.OK)
      .json(wrapApiV1Data(camelizeResponseValue(serializeDates(comment))))
  }

  async deleteComment(ctx: HttpContext) {
    await this.applications
      .makeDeleteComment(actionContextFromHttp(ctx))
      .execute({ comment_id: ctx.params['commentId'] as string })

    ctx.response.status(HttpStatus.NO_CONTENT)
  }

  async listAttachments(ctx: HttpContext) {
    const pagination = normalizePagination(ctx.request.qs(), TASK_PAGINATION)
    const result = await this.applications
      .makeListAttachments(actionContextFromHttp(ctx))
      .execute(
        ctx.params['taskId'] as string,
        pagination.page,
        pagination.perPage
      )

    ctx.response.status(HttpStatus.OK).json({
      ...wrapApiV1Data(camelizeResponseValue(result.rows)),
      pagination: mapApiV1Pagination({
        total: result.total,
        per_page: pagination.perPage,
        current_page: pagination.page,
        last_page: buildPaginationMeta(result.total, pagination).lastPage,
      }),
    })
  }

  async createAttachment(ctx: HttpContext) {
    const context = actionContextFromHttp(ctx)
    const taskId = ctx.params['taskId'] as string
    const attachmentType =
      (readAliasedInput(ctx.request, 'attachmentType', 'attachment_type') as
        | CreateTaskAttachmentDTO['attachment_type']
        | undefined) ?? 'other'
    const uploadedFile = ctx.request.file('file', { size: '25mb' })

    if (uploadedFile) {
      if (!uploadedFile.isValid || !uploadedFile.tmpPath) {
        throw new BusinessLogicException('Task attachment upload is invalid')
      }

      const attachment = await this.applications.makeUploadAttachment(context).execute({
        task_id: taskId,
        temporary_path: uploadedFile.tmpPath,
        original_name: uploadedFile.clientName,
        file_size: uploadedFile.size,
        mime_type: uploadedFileMimeType(uploadedFile),
        attachment_type: attachmentType,
      })

      ctx.response
        .status(HttpStatus.CREATED)
        .json(wrapApiV1Data(camelizeResponseValue(attachment)))
      return
    }

    const attachment = await this.applications.makeCreateAttachment(context).execute({
      task_id: taskId,
      file_name: readAliasedString(ctx.request, 'fileName', 'file_name') ?? '',
      file_path: readAliasedString(ctx.request, 'filePath', 'file_path') ?? '',
      file_size: readAliasedNumber(ctx.request, 'fileSize', 'file_size') ?? null,
      mime_type: readAliasedString(ctx.request, 'mimeType', 'mime_type') ?? null,
      attachment_type: attachmentType,
    })

    ctx.response.status(HttpStatus.CREATED).json(wrapApiV1Data(camelizeResponseValue(attachment)))
  }

  async deleteAttachment(ctx: HttpContext) {
    await this.applications
      .makeDeleteAttachment(actionContextFromHttp(ctx))
      .execute({ attachment_id: ctx.params['attachmentId'] as string })

    ctx.response.status(HttpStatus.NO_CONTENT)
  }
}
