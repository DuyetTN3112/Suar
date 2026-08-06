import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import {
  buildCreateTaskCommentRequest,
  buildDeleteTaskCommentRequest,
  buildTaskCommentMutationRouteRequest,
  buildTaskCommentRouteRequest,
  buildUpdateTaskCommentRequest,
} from '../mappers/request/task-comments/task_comment_request_mapper.js'
import { buildTaskReadPaginationRequest } from '../mappers/request/task-reading/task_read_pagination_request_mapper.js'

import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { mapApiV1Pagination, wrapApiV1Data } from '#modules/http/boundary/api_v1_response'
import { camelizeResponseValue } from '#modules/http/boundary/camelize_response'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { buildPaginationMeta } from '#modules/pagination/public_contracts/pagination_public_api'
import { TaskCompletionApplicationFactory } from '#modules/tasks/actions/ports/inbound/task_completion_application_factory'

type OptionalPayloadKeys<T extends object> = {
  [Key in keyof T]-?: undefined extends T[Key] ? Key : never
}[keyof T]

type OmittedUndefined<T extends object> = {
  [Key in keyof T as Key extends OptionalPayloadKeys<T> ? never : Key]: T[Key]
} & {
  [Key in OptionalPayloadKeys<T>]?: Exclude<T[Key], undefined>
}

function omitUndefined<T extends object>(value: T): OmittedUndefined<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  ) as OmittedUndefined<T>
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
export default class TaskCommentController {
  constructor(private readonly applications: TaskCompletionApplicationFactory) {}

  async index(ctx: HttpContext) {
    const { taskId } = buildTaskCommentRouteRequest(ctx.params)
    const pagination = buildTaskReadPaginationRequest(ctx.request)
    const result = await this.applications
      .makeListComments(actionContextFromHttp(ctx))
      .executeAndWrap(taskId, pagination.page, pagination.perPage)
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

  async store(ctx: HttpContext) {
    const input = buildCreateTaskCommentRequest(ctx.request, ctx.params)
    const comment = await this.applications
      .makeCreateComment(actionContextFromHttp(ctx))
      .executeAndWrap(omitUndefined(input))
      .then((outcome) => outcome.getValue())

    ctx.response.status(HttpStatus.CREATED).json(wrapApiV1Data(camelizeResponseValue(comment)))
  }

  async update(ctx: HttpContext) {
    const input = buildUpdateTaskCommentRequest(ctx.request, ctx.params)
    const comment = await this.applications
      .makeUpdateComment(actionContextFromHttp(ctx))
      .executeAndWrap(input)
      .then((outcome) => outcome.getValue())

    ctx.response
      .status(HttpStatus.OK)
      .json(wrapApiV1Data(camelizeResponseValue(serializeDates(comment))))
  }

  async destroy(ctx: HttpContext) {
    const { taskId } = buildTaskCommentMutationRouteRequest(ctx.params)
    await this.applications
      .makeDeleteComment(actionContextFromHttp(ctx))
      .executeAndWrap(buildDeleteTaskCommentRequest({ ...ctx.params, taskId }))
      .then((outcome) => outcome.getValue())

    ctx.response.status(HttpStatus.NO_CONTENT)
  }
}
