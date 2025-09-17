import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
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

    if (!user) {
      return inertia.render('auth/login', {})
    }

    const organizationId = user.current_organization_id
    if (!organizationId) {
      return inertia.render('org/no_org', {})
    }

    const pageInput = buildCurrentOrganizationTasksIndexPageInput(request, organizationId, ORG_TASKS_DEFAULT_LIMIT)
    pageInput.requested_project_id ??= session.get('current_project_id') as string | undefined

    const pageData = await new GetOrganizationTasksIndexPageQuery(
      actionContextFromHttp(ctx)
    ).execute(pageInput)

    return inertia.render('tasks/index', {
      shellMode: 'organization',
      baseRoute: '/org/tasks',
      ...pageData,
    })
  }
}
