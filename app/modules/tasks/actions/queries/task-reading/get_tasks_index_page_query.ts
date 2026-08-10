import GetTasksListDTO from '../../dtos/request/get_tasks_list_dto.js'

import CheckTaskCreatePermissionQuery from '../task-authoring/check_task_create_permission_query.js'
import GetTaskProjectsQuery from './get_task_projects_query.js'
import GetTasksPageQuery from './get_tasks_page_query.js'

import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { BaseQuery } from '#modules/tasks/actions/base_query'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type { TaskReadRepository } from '#modules/tasks/actions/ports/outbound/task_read_repository'
import type { TaskStatusQueryRepositoryPort } from '#modules/tasks/actions/ports/outbound/task_status_query_repository_port'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { TaskProjectRole } from '#modules/tasks/domain/task-authoring/role_contracts'

type OptionalPayloadKeys<T extends object> = {
  [Key in keyof T]-?: undefined extends T[Key] ? Key : never
}[keyof T]

type OmittedUndefined<T extends object> = {
  [Key in keyof T as Key extends OptionalPayloadKeys<T> ? never : Key]: T[Key]
} & {
  [Key in OptionalPayloadKeys<T>]?: Exclude<T[Key], undefined>
}

function omitUndefined<T extends object>(value: T): OmittedUndefined<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  ) as OmittedUndefined<T>
}


type TaskListSortBy = 'due_date' | 'created_at' | 'updated_at' | 'title' | 'priority'

interface TaskListDateFilters {
  created_at_start?: string
  created_at_end?: string
  due_date_start?: string
  due_date_end?: string
}

export interface GetTasksIndexPageInput {
  page: number
  limit: number
  task_status_id?: string[]
  priority?: string[]
  label?: string[]
  assigned_to?: string[]
  parent_task_id?: string | null
  requested_project_id?: string
  search?: string
  organization_id: string
  sort_by: TaskListSortBy
  sort_order: 'asc' | 'desc'
  created_at_start?: string
  created_at_end?: string
  due_date_start?: string
  due_date_end?: string
}

export interface GetTasksIndexPageResult {
  tasks: {
    data: Awaited<ReturnType<GetTasksPageQuery['execute']>>['tasksResult']['data']
    meta: Awaited<ReturnType<GetTasksPageQuery['execute']>>['tasksResult']['meta']
  }
  stats: NonNullable<Awaited<ReturnType<GetTasksPageQuery['execute']>>['tasksResult']['stats']>
  metadata: Awaited<ReturnType<GetTasksPageQuery['execute']>>['metadata']
  projectOptions: { id: string; name: string }[]
  projectContext: {
    selectedProject: { id: string; name: string } | null
  }
  permissions: {
    canCreateTask: boolean
    createTaskReason: string | null
    canAccessProjectSprints: boolean
    canManageProjectSprints: boolean
  }
  filters: {
    page: number
    limit: number
    task_status_id?: string[]
    status?: string[]
    priority?: string[]
    label?: string[]
    assigned_to?: string[]
    parent_task_id?: string | null
    project_id?: string
    search?: string
    sort_by: TaskListSortBy
    sort_order: 'asc' | 'desc'
    created_at_start?: string
    created_at_end?: string
    due_date_start?: string
    due_date_end?: string
  }
}

export default class GetTasksIndexPageQuery extends BaseQuery<
  GetTasksIndexPageInput,
  GetTasksIndexPageResult
> {
  constructor(
    protected override execCtx: TaskActionContext,
    private taskExternalDependencies: TaskExternalDependencies,
    private readonly taskReadRepository: TaskReadRepository,
    private readonly taskStatusRepository: Pick<
      TaskStatusQueryRepositoryPort,
      'findByOrganization' | 'findByProject'
    >
  ) {
    super(execCtx)
  }

  async handle(input: GetTasksIndexPageInput): Promise<GetTasksIndexPageResult> {
    return this.execute(input)
  }

  async execute(input: GetTasksIndexPageInput): Promise<GetTasksIndexPageResult> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    const projectOptions = await new GetTaskProjectsQuery(
      this.taskExternalDependencies.project
    ).execute(input.organization_id)
    // The personal task board is still project-scoped. If the session has not
    // established a project yet (for example immediately after switching
    // organization), use the first project available to the user instead of
    // silently falling back to own-or-assigned tasks across the organization.
    const selectedProject = input.requested_project_id
      ? (projectOptions.find((project) => project.id === input.requested_project_id) ?? null)
      : (projectOptions[0] ?? null)

    const listInput: ConstructorParameters<typeof GetTasksListDTO>[0] & TaskListDateFilters = omitUndefined({
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
      created_at_start: input.created_at_start,
      created_at_end: input.created_at_end,
      due_date_start: input.due_date_start,
      due_date_end: input.due_date_end,
    })
    const dto = new GetTasksListDTO(listInput)

    const [{ tasksResult, metadata }, createTaskDecision, projectSprintPermissions] = await Promise.all([
      new GetTasksPageQuery(
        this.execCtx,
        this.taskExternalDependencies,
        this.taskReadRepository,
        this.taskStatusRepository
      ).execute(
        dto,
        input.organization_id
      ),
      new CheckTaskCreatePermissionQuery(this.taskExternalDependencies.permission).execute(
        userId,
        input.organization_id,
        selectedProject?.id
      ),
      this.resolveProjectSprintPermissions(userId, selectedProject?.id ?? null),
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
        canAccessProjectSprints: projectSprintPermissions.canAccess,
        canManageProjectSprints: projectSprintPermissions.canManage,
      },
      filters: omitUndefined({
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
        created_at_start: (dto as GetTasksListDTO & TaskListDateFilters).created_at_start,
        created_at_end: (dto as GetTasksListDTO & TaskListDateFilters).created_at_end,
        due_date_start: (dto as GetTasksListDTO & TaskListDateFilters).due_date_start,
        due_date_end: (dto as GetTasksListDTO & TaskListDateFilters).due_date_end,
      }),
    }
  }

  private async resolveProjectSprintPermissions(
    userId: string,
    projectId: string | null
  ): Promise<{ canAccess: boolean; canManage: boolean }> {
    if (!projectId) {
      return { canAccess: false, canManage: false }
    }

    const projectRoleName = await this.taskExternalDependencies.permission.getProjectRoleName(
      userId,
      projectId
    )
    const canManage =
      projectRoleName === TaskProjectRole.OWNER || projectRoleName === TaskProjectRole.MANAGER

    return {
      canAccess: projectRoleName !== null,
      canManage,
    }
  }
}
