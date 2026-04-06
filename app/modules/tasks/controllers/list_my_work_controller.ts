import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import {
  PAGINATION,
  TASKS_DEFAULT_LIMIT,
  toOptionalString,
  toPositiveNumber,
} from './mappers/request/shared.js'

import { omitUndefined } from '#modules/contracts/public_contracts/optional_payload'
import { normalizePagination } from '#modules/pagination/public_contracts/pagination_public_api'
import GetUserTasksQuery from '#modules/tasks/actions/queries/get_user_tasks_query'

/**
 * GET /work
 * Personal cross-organization task list for assigned work.
 */
@inject()
export default class ListMyWorkController {
  constructor(private readonly query: GetUserTasksQuery) {}

  async handle({ auth, inertia, request }: HttpContext) {
    const user = auth.user
    if (!user) {
      return inertia.render('auth/login', {})
    }

    const pagination = normalizePagination(
      {
        page: request.input('page', PAGINATION.DEFAULT_PAGE),
        limit: toPositiveNumber(request.input('limit'), TASKS_DEFAULT_LIMIT),
      },
      PAGINATION,
      { perPage: TASKS_DEFAULT_LIMIT }
    )

    const statusId = toOptionalString(request.input('status') ?? request.input('task_status_id'))
    const priorityId = toOptionalString(request.input('priority'))
    const tasks = await this.query.execute(
      omitUndefined({
        userId: user.id,
        filterType: 'assigned' as const,
        statusId,
        priorityId,
        page: pagination.page,
        limit: pagination.perPage,
      })
    )

    return inertia.render('work/index', {
      tasks,
      filters: {
        page: pagination.page,
        limit: pagination.perPage,
        status: statusId,
        priority: priorityId,
      },
    })
  }
}
