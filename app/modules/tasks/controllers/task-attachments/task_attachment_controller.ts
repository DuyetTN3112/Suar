import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import {
  buildTaskAttachmentMutationRouteRequest,
  buildTaskAttachmentRouteRequest,
  buildStoreTaskAttachmentRequest,
} from '../mappers/request/task-attachments/task_attachment_request.js'
import { buildTaskReadPaginationRequest } from '../mappers/request/task-reading/task_read_pagination_request_mapper.js'

import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { mapApiV1Pagination, wrapApiV1Data } from '#modules/http/boundary/api_v1_response'
import { camelizeResponseValue } from '#modules/http/boundary/camelize_response'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { buildPaginationMeta } from '#modules/pagination/public_contracts/pagination_public_api'
import { TaskCompletionApplicationFactory } from '#modules/tasks/actions/ports/inbound/task_completion_application_factory'

@inject()
export default class TaskAttachmentController {
  constructor(private readonly applications: TaskCompletionApplicationFactory) {}

  async index(ctx: HttpContext) {
    const { taskId } = buildTaskAttachmentRouteRequest(ctx.params)
    const pagination = buildTaskReadPaginationRequest(ctx.request)
    const result = await this.applications
      .makeListAttachments(actionContextFromHttp(ctx))
      .executeAndWrap(taskId, pagination.page, pagination.perPage)
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

  async store(ctx: HttpContext) {
    const context = actionContextFromHttp(ctx)
    const uploadedFile = ctx.request.file('file', { size: '25mb' })
    const input = buildStoreTaskAttachmentRequest(ctx.request, ctx.params, uploadedFile)
    const attachment = await this.applications
      .makeStoreAttachment(context)
      .executeAndWrap(input)
      .then((outcome) => outcome.getValue())

    ctx.response.status(HttpStatus.CREATED).json(wrapApiV1Data(camelizeResponseValue(attachment)))
  }

  async destroy(ctx: HttpContext) {
    const { attachmentId } = buildTaskAttachmentMutationRouteRequest(ctx.params)
    await this.applications
      .makeDeleteAttachment(actionContextFromHttp(ctx))
      .executeAndWrap({ attachment_id: attachmentId })
      .then((outcome) => outcome.getValue())

    ctx.response.status(HttpStatus.NO_CONTENT)
  }
}
