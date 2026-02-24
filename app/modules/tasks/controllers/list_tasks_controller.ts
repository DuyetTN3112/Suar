import type { HttpContext } from '@adonisjs/core/http'

import { buildGetTasksIndexPageInput } from './mappers/request/task_request_mapper.js'

import {
  actionContextFromHttp,
  requireCurrentOrganizationId,
} from '#modules/http/public_contracts/http_execution_context'
import { makeGetTasksIndexPageQuery } from '#modules/tasks/bootstrap/task_action_factory'

const TASKS_DEFAULT_LIMIT = 10

/**
 * GET /tasks
 * Display tasks list with filters and permissions
 */
export default class ListTasksController {
  async handle(ctx: HttpContext) {
    const { request, inertia, session } = ctx
    const organizationId = requireCurrentOrganizationId(ctx)

    const pageInput = buildGetTasksIndexPageInput(request, organizationId, TASKS_DEFAULT_LIMIT)
    const sessionProjectId = session.get('current_project_id') as string | undefined
    if (pageInput.requested_project_id === undefined && sessionProjectId !== undefined) {
      pageInput.requested_project_id = sessionProjectId
    }

    const pageData = await makeGetTasksIndexPageQuery(actionContextFromHttp(ctx)).execute(pageInput)

    return await inertia.render('tasks/index', pageData)
  }
}
