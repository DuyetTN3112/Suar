import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import BusinessLogicException from '#exceptions/business_logic_exception'
import { ErrorMessages } from '#constants/error_constants'
import GetTasksListDTO from '#actions/tasks/dtos/get_tasks_list_dto'
import GetTasksListQuery from '#actions/tasks/queries/get_tasks_list_query'
import GetTaskMetadataQuery from '#actions/tasks/queries/get_task_metadata_query'

/**
 * GET /tasks
 * Display tasks list with filters and permissions
 */
export default class ListTasksController {
  async handle(ctx: HttpContext) {
    try {
      const { request, inertia, session } = ctx
      const organizationId = session.get('current_organization_id') as string | undefined
      if (!organizationId) {
        throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
      }

      const execCtx = ExecutionContext.fromHttp(ctx)
      const getTasksListQuery = new GetTasksListQuery(execCtx)
      const getTaskMetadataQuery = new GetTaskMetadataQuery(execCtx)

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

      const [tasksResult, metadata] = await Promise.all([
        getTasksListQuery.execute(dto),
        getTaskMetadataQuery.execute(organizationId),
      ])

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
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Có lỗi xảy ra khi tải danh sách nhiệm vụ'
      ctx.session.flash('error', errorMessage)
      return ctx.inertia.render('tasks/index', {
        tasks: {
          data: [],
          meta: {
            total: 0,
            per_page: 10,
            current_page: 1,
            last_page: 0,
            first_page: 1,
            next_page_url: null,
            previous_page_url: null,
          },
        },
        stats: {},
        metadata: {
          statuses: [],
          priorities: [],
          labels: [],
          users: [],
        },
        filters: {},
      })
    }
  }
}
