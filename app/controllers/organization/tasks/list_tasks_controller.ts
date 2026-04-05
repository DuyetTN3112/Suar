import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import GetTasksListDTO from '#actions/tasks/dtos/request/get_tasks_list_dto'
import GetTasksPageQuery from '#actions/tasks/queries/get_tasks_page_query'
import GetTaskProjectsQuery from '#actions/tasks/queries/get_task_projects_query'
import CheckTaskCreatePermissionQuery from '#actions/tasks/queries/check_task_create_permission_query'
import UnauthorizedException from '#exceptions/unauthorized_exception'

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

    const projectOptions = await new GetTaskProjectsQuery().execute(organizationId)
    const execCtx = ExecutionContext.fromHttp(ctx)
    const userId = execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    const requestedProjectId = request.input('project_id') as string | undefined
    const selectedProject = requestedProjectId
      ? (projectOptions.find((project) => project.id === requestedProjectId) ?? null)
      : null

    const dto = new GetTasksListDTO({
      page: request.input('page', 1) as number,
      limit: request.input('limit', 10) as number,
      task_status_id: (request.input('task_status_id') ?? request.input('status')) as
        | string
        | undefined,
      priority: request.input('priority') as string | undefined,
      label: request.input('label') as string | undefined,
      assigned_to: request.input('assigned_to') as string | undefined,
      parent_task_id: request.input('parent_task_id') as string | null | undefined,
      project_id: selectedProject?.id,
      search: request.input('search') as string | undefined,
      organization_id: organizationId,
      sort_by: request.input('sort_by', 'due_date') as
        | 'due_date'
        | 'created_at'
        | 'updated_at'
        | 'title'
        | 'priority',
      sort_order: request.input('sort_order', 'asc') as 'asc' | 'desc',
    })

    const [{ tasksResult, metadata }, createTaskDecision] = await Promise.all([
      new GetTasksPageQuery(execCtx).execute(dto, organizationId),
      CheckTaskCreatePermissionQuery.execute(userId, organizationId, selectedProject?.id),
    ])

    return await inertia.render('tasks/index', {
      shellMode: 'organization',
      baseRoute: '/org/tasks',
      tasks: {
        data: tasksResult.data,
        meta: tasksResult.meta,
      },
      stats: tasksResult.stats || {},
      metadata,
      projectOptions,
      projectContext: {
        selectedProject,
      },
      permissions: {
        canCreateTask: createTaskDecision.allowed,
        createTaskReason: createTaskDecision.allowed ? null : createTaskDecision.reason,
      },
      filters: {
        page: dto.page,
        limit: dto.limit,
        task_status_id: dto.task_status_id,
        status: dto.task_status_id,
        priority: dto.priority,
        label: dto.label,
        assigned_to: dto.assigned_to,
        parent_task_id: dto.parent_task_id,
        project_id: dto.project_id,
        search: dto.search,
        sort_by: dto.sort_by,
        sort_order: dto.sort_order,
      },
    })
  }
}
