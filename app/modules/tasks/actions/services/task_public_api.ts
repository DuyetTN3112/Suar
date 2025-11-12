import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import CreateTaskStatusCommand from '../commands/create_task_status_command.js'
import GetTasksListDTO from '../dtos/request/get_tasks_list_dto.js'
import type { CreateTaskStatusDTO } from '../dtos/request/task_status_dtos.js'
import type { TaskPublicApiRepositoryPort } from '../ports/task_public_api_repository_port.js'
import {
  taskPublicApiRepository,
} from '../ports/task_public_api_repository_port_impl.js'
import GetTasksIndexPageQuery, {
  type GetTasksIndexPageInput,
  type GetTasksIndexPageResult,
} from '../queries/get_tasks_index_page_query.js'
import GetTasksListQuery from '../queries/get_tasks_list_query.js'

import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/task_external_dependencies'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import type { TaskStatusRecord } from '#modules/tasks/types/task_records'

type TaskListPublicSortBy = 'due_date' | 'created_at' | 'updated_at' | 'title' | 'priority'

export interface TaskListPublicOptions {
  organizationId: string
  statusId?: string
  priorityId?: string
  projectId?: string
  assignedTo?: string
  search?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export class TaskPublicApi {
  private taskExternalDependencies: TaskExternalDependencies | null = null

  constructor(private readonly repository: TaskPublicApiRepositoryPort = taskPublicApiRepository) {}

  configureExternalDependencies(dependencies: TaskExternalDependencies): void {
    this.taskExternalDependencies = dependencies
  }

  private requireExternalDependencies(): TaskExternalDependencies {
    if (!this.taskExternalDependencies) {
      throw new Error('TaskPublicApi external dependencies have not been configured')
    }

    return this.taskExternalDependencies
  }

  async countByAssignees(
    projectId: string,
    userIds?: string[],
    trx?: TransactionClientContract
  ): Promise<Map<string, number>> {
    return this.repository.countByAssignees(projectId, userIds, trx)
  }

  async countByProjectIds(
    projectIds: string[],
    trx?: TransactionClientContract
  ): Promise<Map<string, number>> {
    return this.repository.countByProjectIds(projectIds, trx)
  }

  async countIncompleteByProject(
    projectId: string,
    trx?: TransactionClientContract
  ): Promise<number> {
    return this.repository.countIncompleteByProject(projectId, trx)
  }

  async getSummaryByProject(projectId: string) {
    return this.repository.getTasksSummaryByProject(projectId)
  }

  async listPreviewByProject(projectId: string, limit: number) {
    return await this.repository.listPreviewByProject(projectId, limit)
  }

  async reassignByUser(
    projectId: string,
    fromUserId: string,
    toUserId: string,
    trx?: TransactionClientContract
  ): Promise<void> {
    await this.repository.reassignByUser(projectId, fromUserId, toUserId, trx)
  }

  async unassignByUserInProjects(
    projectIds: string[],
    userId: string,
    trx?: TransactionClientContract
  ): Promise<void> {
    await this.repository.unassignByUserInProjects(projectIds, userId, trx)
  }

  async findCompletedAssignment(
    assignmentId: string,
    trx?: TransactionClientContract
  ) {
    return this.repository.findCompletedAssignment(assignmentId, trx)
  }

  async getTasksIndexPage(
    input: GetTasksIndexPageInput,
    execCtx: TaskActionContext
  ): Promise<GetTasksIndexPageResult> {
    return new GetTasksIndexPageQuery(execCtx, this.requireExternalDependencies()).execute(input)
  }

  async createTaskStatus(
    dto: CreateTaskStatusDTO,
    execCtx: TaskActionContext
  ): Promise<TaskStatusRecord> {
    return new CreateTaskStatusCommand(execCtx).execute(dto)
  }

  async getTasksList(options: TaskListPublicOptions, execCtx: TaskActionContext) {
    const dto = new GetTasksListDTO({
      organization_id: options.organizationId,
      status: options.statusId,
      priority: options.priorityId,
      project_id: options.projectId,
      assigned_to: options.assignedTo,
      search: options.search,
      page: options.page,
      limit: options.limit,
      sort_by: options.sortBy as TaskListPublicSortBy | undefined,
      sort_order: options.sortOrder,
    })

    return new GetTasksListQuery(execCtx, this.requireExternalDependencies()).execute(dto)
  }
}

export const taskPublicApi = new TaskPublicApi()
