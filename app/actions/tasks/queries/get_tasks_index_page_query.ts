import type { ExecutionContext } from '#types/execution_context'
import type { DatabaseId } from '#types/database'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import GetTasksListDTO from '../dtos/request/get_tasks_list_dto.js'
import GetTaskProjectsQuery from './get_task_projects_query.js'
import GetTasksPageQuery from './get_tasks_page_query.js'
import CheckTaskCreatePermissionQuery from './check_task_create_permission_query.js'

type TaskListSortBy = 'due_date' | 'created_at' | 'updated_at' | 'title' | 'priority'

export interface GetTasksIndexPageInput {
  page: number
  limit: number
  task_status_id?: DatabaseId
  priority?: DatabaseId
  label?: DatabaseId
  assigned_to?: DatabaseId
  parent_task_id?: DatabaseId | null
  requested_project_id?: DatabaseId
  search?: string
  organization_id: DatabaseId
  sort_by: TaskListSortBy
  sort_order: 'asc' | 'desc'
}

export interface GetTasksIndexPageResult {
  tasks: {
    data: Awaited<ReturnType<GetTasksPageQuery['execute']>>['tasksResult']['data']
    meta: Awaited<ReturnType<GetTasksPageQuery['execute']>>['tasksResult']['meta']
  }
  stats: NonNullable<Awaited<ReturnType<GetTasksPageQuery['execute']>>['tasksResult']['stats']>
  metadata: Awaited<ReturnType<GetTasksPageQuery['execute']>>['metadata']
  projectOptions: Array<{ id: DatabaseId; name: string }>
  projectContext: {
    selectedProject: { id: DatabaseId; name: string } | null
  }
  permissions: {
    canCreateTask: boolean
    createTaskReason: string | null
  }
  filters: {
    page: number
    limit: number
    task_status_id?: DatabaseId
    status?: DatabaseId
    priority?: DatabaseId
    label?: DatabaseId
    assigned_to?: DatabaseId
    parent_task_id?: DatabaseId | null
    project_id?: DatabaseId
    search?: string
    sort_by: TaskListSortBy
    sort_order: 'asc' | 'desc'
  }
}

export default class GetTasksIndexPageQuery {
  constructor(protected execCtx: ExecutionContext) {}

  async execute(input: GetTasksIndexPageInput): Promise<GetTasksIndexPageResult> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    const projectOptions = await new GetTaskProjectsQuery().execute(input.organization_id)
    const selectedProject = input.requested_project_id
      ? (projectOptions.find((project) => project.id === input.requested_project_id) ?? null)
      : null

    const dto = new GetTasksListDTO({
      page: input.page,
      limit: input.limit,
      task_status_id: input.task_status_id,
      priority: input.priority,
      label: input.label,
      assigned_to: input.assigned_to,
      parent_task_id: input.parent_task_id,
      project_id: selectedProject?.id,
      search: input.search,
      organization_id: input.organization_id,
      sort_by: input.sort_by,
      sort_order: input.sort_order,
    })

    const [{ tasksResult, metadata }, createTaskDecision] = await Promise.all([
      new GetTasksPageQuery(this.execCtx).execute(dto, input.organization_id),
      CheckTaskCreatePermissionQuery.execute(userId, input.organization_id, selectedProject?.id),
    ])

    return {
      tasks: {
        data: tasksResult.data,
        meta: tasksResult.meta,
      },
      stats: tasksResult.stats ?? {
        total: 0,
        by_status: {},
      },
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
    }
  }
}
