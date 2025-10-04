import type { HttpContext } from '@adonisjs/core/http'

import {
  actionContextFromHttp,
  resolveCurrentOrganizationId,
} from '#modules/http/public_contracts/http_execution_context'
import GetOrganizationTasksIndexPageQuery from '#modules/organizations/actions/current/tasks/queries/get_organization_tasks_index_page_query'
import { buildCurrentOrganizationTasksIndexPageInput } from '#modules/organizations/controllers/current/tasks/mappers/request/current_task_request_mapper'

const ORG_TASKS_DEFAULT_LIMIT = 10

/**
 * List org-scoped tasks in the organization admin shell.
 * Renders the same kanban/task shell as `/tasks`, but inside `OrganizationLayout`.
 */
export default class ListTasksController {
  async handle(ctx: HttpContext) {
    const { request, inertia, auth, session } = ctx
    const user = auth.user
    const currentPath = request.url()
    const isOrganizationWideScope = request.input('scope') === 'organization'

    if (!user) {
      return inertia.render('auth/login', {})
    }

    const organizationId = resolveCurrentOrganizationId(ctx)
    if (!organizationId) {
      return inertia.render('org/no_org', {})
    }

    const pageInput = buildCurrentOrganizationTasksIndexPageInput(request, organizationId, ORG_TASKS_DEFAULT_LIMIT)
    if (!isOrganizationWideScope) {
      const sessionProjectId = session.get('current_project_id') as string | undefined
      if (pageInput.requested_project_id === undefined && sessionProjectId !== undefined) {
        pageInput.requested_project_id = sessionProjectId
      }
    }

    const pageData = await new GetOrganizationTasksIndexPageQuery(
      actionContextFromHttp(ctx)
    ).execute(pageInput)

    const workspaceView = currentPath.includes('/org/tasks/list') ? 'list' : 'board'
    const baseRoute = workspaceView === 'list' ? '/org/tasks/list' : '/org/tasks/board'

    return inertia.render('tasks/index', {
      shellMode: 'organization',
      workspaceView,
      baseRoute,
      ...pageData,
      filters: {
        ...pageData.filters,
        ...(isOrganizationWideScope ? { scope: 'organization' } : {}),
      },
    })
  }
}
