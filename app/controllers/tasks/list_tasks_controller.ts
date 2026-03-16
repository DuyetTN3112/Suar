import type { HttpContext } from '@adonisjs/core/http'
import BusinessLogicException from '#exceptions/business_logic_exception'
import { ErrorMessages } from '#constants/error_constants'
import GetTasksListDTO from '#actions/tasks/dtos/request/get_tasks_list_dto'
import GetTasksPageQuery from '#actions/tasks/queries/get_tasks_page_query'

/**
 * GET /tasks
 * Display tasks list with filters and permissions
 */
export default class ListTasksController {
  async handle(ctx: HttpContext) {
    const { request, inertia, session } = ctx
    const organizationId = session.get('current_organization_id') as string | undefined
    if (!organizationId) {
      throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
    }

    const dto = new GetTasksListDTO({
      page: request.input('page', 1) as number,
      limit: request.input('limit', 10) as number,
      status: request.input('status') as string | undefined,
      priority: request.input('priority') as string | undefined,
      label: request.input('label') as string | undefined,
      assigned_to: request.input('assigned_to') as string | undefined,
      parent_task_id: request.input('parent_task_id') as string | null | undefined,
      project_id: request.input('project_id') as string | null | undefined,
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

    const { tasksResult, metadata } = await new GetTasksPageQuery(ctx).execute(dto, organizationId)

    return await inertia.render('tasks/index', {
      tasks: {
        data: tasksResult.data,
        meta: tasksResult.meta,
      },
      stats: tasksResult.stats || {},
      metadata: metadata,
      filters: {
        page: dto.page,
        limit: dto.limit,
        status: dto.status,
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
