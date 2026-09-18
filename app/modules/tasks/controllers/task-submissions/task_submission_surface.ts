import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

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
import type { CreateTaskAttachmentDTO } from '#modules/tasks/actions/commands/task-attachments/create_task_attachment_command'
import type { CreateTaskCommentDTO } from '#modules/tasks/actions/commands/task-comments/create_task_comment_command'
import type { UpdateTaskCommentDTO } from '#modules/tasks/actions/commands/task-comments/update_task_comment_command'
import type { AddTaskSubmissionEvidenceDTO } from '#modules/tasks/actions/commands/task-submissions/add_task_submission_evidence_command'
import { TASK_PAGINATION } from '#modules/tasks/actions/dtos/common/task_pagination'
import { TaskCompletionApplicationFactory } from '#modules/tasks/actions/ports/inbound/task_completion_application_factory'
import { buildTaskCompletionReportInput } from '#modules/tasks/controllers/mappers/request/task-submissions/task_completion_report_request'
import {
  buildSubmissionDTO,
  omitUndefined,
  readAliasedNumber,
  readAliasedString,
  serializeDates,
  uploadedFileMimeType,
} from '#modules/tasks/controllers/mappers/request/task-submissions/task_submission_request'
import { mapTaskCompletionReportEditorResponse } from '#modules/tasks/controllers/mappers/response/task-submissions/task_completion_report_response_mapper'
import { mapTaskCompletionReviewPackageResponse } from '#modules/tasks/controllers/mappers/response/task-submissions/task_completion_review_package_response_mapper'

@inject()
export default class TaskSubmissionController {
  constructor(private readonly applications: TaskCompletionApplicationFactory) {}

  async show(ctx: HttpContext) {
    const submission = await this.applications
      .makeGetSubmission(actionContextFromHttp(ctx))
      .executeAndWrap(ctx.params['taskId'] as string)
      .then((outcome) => outcome.getValue())

    ctx.response.status(HttpStatus.OK).json(wrapApiV1Data(camelizeResponseValue(submission)))
  }

  async saveDraft(ctx: HttpContext) {
    const submission = await this.applications
      .makeSubmitSubmission(actionContextFromHttp(ctx))
      .executeAndWrap(buildSubmissionDTO(ctx, false))
      .then((outcome) => outcome.getValue())

    ctx.response.status(HttpStatus.OK).json(wrapApiV1Data(camelizeResponseValue(submission)))
  }

  async submit(ctx: HttpContext) {
    const submission = await this.applications
      .makeSubmitSubmission(actionContextFromHttp(ctx))
      .executeAndWrap(buildSubmissionDTO(ctx, true))
      .then((outcome) => outcome.getValue())

    ctx.response.status(HttpStatus.OK).json(wrapApiV1Data(camelizeResponseValue(submission)))
  }

  async showCompletionReport(ctx: HttpContext) {
    const report = await this.applications
      .makeGetCompletionReport(actionContextFromHttp(ctx))
      .executeAndWrap(ctx.params['assignmentId'] as string)
      .then((outcome) => outcome.getValue())

    ctx.response
      .status(HttpStatus.OK)
      .json(wrapApiV1Data(report ? mapTaskCompletionReportEditorResponse(report) : null))
  }

  async showCompletionReviewPackage(ctx: HttpContext) {
    const reviewPackage = await this.applications
      .makeGetCompletionReviewPackage(actionContextFromHttp(ctx))
      .executeAndWrap(ctx.params['reportId'] as string)
      .then((outcome) => outcome.getValue())

    ctx.response
      .status(HttpStatus.OK)
      .json(wrapApiV1Data(mapTaskCompletionReviewPackageResponse(reviewPackage)))
  }

  async startCompletionReport(ctx: HttpContext) {
    const start = await this.applications
      .makeStartCompletionReport(actionContextFromHttp(ctx))
      .executeAndWrap(ctx.params['assignmentId'] as string)
      .then((outcome) => outcome.getValue())

    ctx.response.status(HttpStatus.CREATED).json(wrapApiV1Data(start))
  }

  async saveCompletionReportDraft(ctx: HttpContext) {
    const report = await this.applications
      .makeSaveCompletionReportDraft(actionContextFromHttp(ctx))
      .executeAndWrap(buildTaskCompletionReportInput(ctx))
      .then((outcome) => outcome.getValue())

    ctx.response
      .status(HttpStatus.OK)
      .json(wrapApiV1Data(mapTaskCompletionReportEditorResponse(report)))
  }

  async submitCompletionReport(ctx: HttpContext) {
    const report = await this.applications
      .makeSubmitCompletionReport(actionContextFromHttp(ctx))
      .executeAndWrap(buildTaskCompletionReportInput(ctx))
      .then((outcome) => outcome.getValue())

    ctx.response
      .status(HttpStatus.OK)
      .json(wrapApiV1Data(mapTaskCompletionReportEditorResponse(report)))
  }

  async lock(ctx: HttpContext) {
    const submission = await this.applications
      .makeLockSubmission(actionContextFromHttp(ctx))
      .executeAndWrap(ctx.params['taskId'] as string)
      .then((outcome) => outcome.getValue())

    ctx.response.status(HttpStatus.OK).json(wrapApiV1Data(camelizeResponseValue(submission)))
  }

  async listEvidences(ctx: HttpContext) {
    const evidences = await this.applications
      .makeListEvidences(actionContextFromHttp(ctx))
      .executeAndWrap(ctx.params['submissionId'] as string)
      .then((outcome) => outcome.getValue())

    ctx.response.status(HttpStatus.OK).json(wrapApiV1Data(camelizeResponseValue(evidences)))
  }

  async addEvidence(ctx: HttpContext) {
    const body = ctx.request.only(['evidenceType', 'evidence_type', 'url', 'title', 'description'])
    const evidence = await this.applications
      .makeAddEvidence(actionContextFromHttp(ctx))
      .executeAndWrap({
        submission_id: ctx.params['submissionId'] as string,
        evidence_type: (body.evidenceType ??
          body.evidence_type) as AddTaskSubmissionEvidenceDTO['evidence_type'],
        url: String(body.url ?? ''),
        title: (body.title as string | null | undefined) ?? null,
        description: (body.description as string | null | undefined) ?? null,
      })
      .then((outcome) => outcome.getValue())

    ctx.response.status(HttpStatus.CREATED).json(wrapApiV1Data(camelizeResponseValue(evidence)))
  }

  async deleteEvidence(ctx: HttpContext) {
    await this.applications
      .makeDeleteEvidence(actionContextFromHttp(ctx))
      .executeAndWrap({ evidence_id: ctx.params['evidenceId'] as string })
      .then((outcome) => outcome.getValue())

    ctx.response.status(HttpStatus.NO_CONTENT)
  }

  async listComments(ctx: HttpContext) {
    const pagination = normalizePagination(ctx.request.qs(), TASK_PAGINATION)
    const result = await this.applications
      .makeListComments(actionContextFromHttp(ctx))
      .executeAndWrap(ctx.params['taskId'] as string, pagination.page, pagination.perPage)
      .then((outcome) => outcome.getValue())

    ctx.response.status(HttpStatus.OK).json({
      ...wrapApiV1Data(camelizeResponseValue(result.comments)),
      pagination: mapApiV1Pagination({
        total: result.totalRootThreads,
        per_page: pagination.perPage,
        current_page: pagination.page,
        last_page: buildPaginationMeta(result.totalRootThreads, pagination).lastPage,
      }),
    })
  }

  async createComment(ctx: HttpContext) {
    const comment = await this.applications
      .makeCreateComment(actionContextFromHttp(ctx))
      .executeAndWrap(
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
            (ctx.request.input('visibility') as CreateTaskCommentDTO['visibility'] | undefined) ??
            'internal',
          review_relevance: readAliasedInput(ctx.request, 'reviewRelevance', 'review_relevance') as
            | boolean
            | undefined,
        })
      )
      .then((outcome) => outcome.getValue())

    ctx.response.status(HttpStatus.CREATED).json(wrapApiV1Data(camelizeResponseValue(comment)))
  }

  async updateComment(ctx: HttpContext) {
    const update = omitUndefined({
      task_id: ctx.params['taskId'] as string,
      comment_id: ctx.params['commentId'] as string,
      body: ctx.request.input('body') as string | undefined,
      comment_type: readAliasedInput(ctx.request, 'commentType', 'comment_type') as
        | string
        | undefined,
      visibility: ctx.request.input('visibility') as string | undefined,
      review_relevance: readAliasedInput(ctx.request, 'reviewRelevance', 'review_relevance') as
        | boolean
        | undefined,
    }) as UpdateTaskCommentDTO
    const comment = await this.applications
      .makeUpdateComment(actionContextFromHttp(ctx))
      .executeAndWrap(update)
      .then((outcome) => outcome.getValue())

    ctx.response
      .status(HttpStatus.OK)
      .json(wrapApiV1Data(camelizeResponseValue(serializeDates(comment))))
  }

  async deleteComment(ctx: HttpContext) {
    await this.applications
      .makeDeleteComment(actionContextFromHttp(ctx))
      .executeAndWrap({ comment_id: ctx.params['commentId'] as string })
      .then((outcome) => outcome.getValue())

    ctx.response.status(HttpStatus.NO_CONTENT)
  }

  async listAttachments(ctx: HttpContext) {
    const pagination = normalizePagination(ctx.request.qs(), TASK_PAGINATION)
    const result = await this.applications
      .makeListAttachments(actionContextFromHttp(ctx))
      .executeAndWrap(ctx.params['taskId'] as string, pagination.page, pagination.perPage)
      .then((outcome) => outcome.getValue())

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

      const attachment = await this.applications
        .makeUploadAttachment(context)
        .executeAndWrap({
          task_id: taskId,
          temporary_path: uploadedFile.tmpPath,
          original_name: uploadedFile.clientName,
          file_size: uploadedFile.size,
          mime_type: uploadedFileMimeType(uploadedFile),
          attachment_type: attachmentType,
        })
        .then((outcome) => outcome.getValue())

      ctx.response.status(HttpStatus.CREATED).json(wrapApiV1Data(camelizeResponseValue(attachment)))
      return
    }

    const attachment = await this.applications
      .makeCreateAttachment(context)
      .executeAndWrap({
        task_id: taskId,
        file_name: readAliasedString(ctx.request, 'fileName', 'file_name') ?? '',
        file_path: readAliasedString(ctx.request, 'filePath', 'file_path') ?? '',
        file_size: readAliasedNumber(ctx.request, 'fileSize', 'file_size') ?? null,
        mime_type: readAliasedString(ctx.request, 'mimeType', 'mime_type') ?? null,
        attachment_type: attachmentType,
      })
      .then((outcome) => outcome.getValue())

    ctx.response.status(HttpStatus.CREATED).json(wrapApiV1Data(camelizeResponseValue(attachment)))
  }

  async deleteAttachment(ctx: HttpContext) {
    await this.applications
      .makeDeleteAttachment(actionContextFromHttp(ctx))
      .executeAndWrap({ attachment_id: ctx.params['attachmentId'] as string })
      .then((outcome) => outcome.getValue())

    ctx.response.status(HttpStatus.NO_CONTENT)
  }
}
