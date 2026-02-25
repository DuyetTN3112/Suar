import type { HttpContext } from '@adonisjs/core/http'

import {
  actionContextFromHttp,
  requireCurrentOrganizationId,
} from '#modules/http/public_contracts/http_execution_context'
import { normalizePagination } from '#modules/pagination/public_contracts/pagination_public_api'
import { TASK_PAGINATION } from '#modules/tasks/application/dtos/common/task_pagination'
import { makeGetTaskStatusBoardPageQuery } from '#modules/tasks/bootstrap/task_action_factory'

/**
 * GET /tasks/status-board
 * POC page for status board slice scaffold validation.
 */
export default class ShowTaskStatusBoardController {
  async handle(ctx: HttpContext) {
    const { inertia, request } = ctx
    const organizationId = requireCurrentOrganizationId(ctx)
    const pagination = normalizePagination(
      {
        page: request.input('page', TASK_PAGINATION.DEFAULT_PAGE) as unknown,
        perPage: request.input(
          'perPage',
          request.input('limit', TASK_PAGINATION.DEFAULT_PER_PAGE)
        ) as unknown,
      },
      TASK_PAGINATION,
      { perPage: 20 }
    )

    const pageData = await makeGetTaskStatusBoardPageQuery(actionContextFromHttp(ctx)).execute(
      organizationId,
      { page: pagination.page, limit: pagination.perPage }
    )

    return inertia.render('tasks/status_board', pageData)
  }
}
