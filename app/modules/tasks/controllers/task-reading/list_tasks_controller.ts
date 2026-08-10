import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { buildGetTasksIndexPageInput } from '../mappers/request/task-reading/task_request_mapper.js'

import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import {
  actionContextFromHttp,
  requireCurrentOrganizationId,
} from '#modules/http/boundary/http_execution_context'
import { TaskBoardQueryFactory } from '#modules/tasks/actions/ports/inbound/task_board_query_factory'

const TASKS_DEFAULT_LIMIT = 10

/**
 * GET /tasks
 * Display tasks list with filters and permissions
 */
@inject()
export default class ListTasksController {
  constructor(private readonly boardQueries: TaskBoardQueryFactory) {}

  async handle(ctx: HttpContext) {
    const { request, inertia, session, params } = ctx
    const organizationId = requireCurrentOrganizationId(ctx)
    const routeProjectId =
      typeof params['projectId'] === 'string' ? params['projectId'] : undefined

    const pageInput = buildGetTasksIndexPageInput(request, organizationId, TASKS_DEFAULT_LIMIT)
    const sessionProjectId = session.get('current_project_id') as string | undefined
    if (routeProjectId) {
      pageInput.requested_project_id = routeProjectId
    } else if (pageInput.requested_project_id === undefined && sessionProjectId !== undefined) {
      pageInput.requested_project_id = sessionProjectId
    }

    const pageData = await this.boardQueries
      .makeIndexPage(actionContextFromHttp(ctx))
      .executeAndWrap(pageInput)
      .then((outcome) => outcome.getValue())

    if (routeProjectId && pageData.projectContext.selectedProject?.id !== routeProjectId) {
      throw new NotFoundException('Project not found or unavailable in the current organization')
    }

    if (routeProjectId) {
      session.put('current_project_id', routeProjectId)
      await session.commit()
    }

    return await inertia.render('tasks/index', {
      ...pageData,
      shellMode: routeProjectId ? 'project' : 'app',
      workspaceView: 'board',
      baseRoute: routeProjectId ? `/projects/${routeProjectId}/tasks` : '/tasks',
    })
  }
}
