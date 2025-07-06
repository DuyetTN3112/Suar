import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import GetTasksIndexPageQuery from '#actions/tasks/queries/get_tasks_index_page_query'
import { buildGetTasksIndexPageInput } from '#controllers/tasks/mappers/request/task_request_mapper'

const ORG_TASKS_DEFAULT_LIMIT = 10

/**
 * List org-scoped tasks in the organization admin shell.
 * Renders the same kanban/task shell as `/tasks`, but inside `OrganizationLayout`.
 */
export default class ListTasksController {
  async handle(ctx: HttpContext) {
    const { request, inertia, auth } = ctx
    const user = auth.user

    if (!user) {
      return inertia.render('auth/login', {})
    }

    const organizationId = user.current_organization_id
    if (!organizationId) {
      return inertia.render('org/no_org', {})
    }

    const pageData = await new GetTasksIndexPageQuery(ExecutionContext.fromHttp(ctx)).execute(
      buildGetTasksIndexPageInput(request, organizationId, ORG_TASKS_DEFAULT_LIMIT)
    )

    return await inertia.render('tasks/index', {
      shellMode: 'organization',
      baseRoute: '/org/tasks',
      ...pageData,
    })
  }
}
