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

import type { DatabaseId } from '#types/database'
import type { ExecutionContext } from '#types/execution_context'
import type { TaskStatusRecord } from '#types/task_records'

type TaskListPublicSortBy = 'due_date' | 'created_at' | 'updated_at' | 'title' | 'priority'

export interface TaskListPublicOptions {
  organizationId: DatabaseId
  statusId?: DatabaseId
  priorityId?: DatabaseId
  projectId?: DatabaseId
  assignedTo?: DatabaseId
  search?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export class TaskPublicApi {
  constructor(private readonly repository: TaskPublicApiRepositoryPort = taskPublicApiRepository) {}

  async countByAssignees(
    projectId: DatabaseId,
    userIds?: DatabaseId[],
    trx?: TransactionClientContract
  ): Promise<Map<string, number>> {
    return this.repository.countByAssignees(projectId, userIds, trx)
  }

  async countByProjectIds(
    projectIds: DatabaseId[],
    trx?: TransactionClientContract
  ): Promise<Map<string, number>> {
    return this.repository.countByProjectIds(projectIds, trx)
  }

  async countIncompleteByProject(
    projectId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<number> {
    return this.repository.countIncompleteByProject(projectId, trx)
  }

  async getSummaryByProject(projectId: DatabaseId) {
    return this.repository.getTasksSummaryByProject(projectId)
  }

  async listPreviewByProject(projectId: DatabaseId, limit: number) {
    return await this.repository.listPreviewByProject(projectId, limit)
  }

  async reassignByUser(
    projectId: DatabaseId,
    fromUserId: DatabaseId,
    toUserId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<void> {
    await this.repository.reassignByUser(projectId, fromUserId, toUserId, trx)
  }

  async unassignByUserInProjects(
    projectIds: DatabaseId[],
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<void> {
    await this.repository.unassignByUserInProjects(projectIds, userId, trx)
  }

  async findCompletedAssignment(
    assignmentId: DatabaseId,
    trx?: TransactionClientContract
  ) {
    return this.repository.findCompletedAssignment(assignmentId, trx)
  }

  async getTasksIndexPage(
    input: GetTasksIndexPageInput,
    execCtx: ExecutionContext
  ): Promise<GetTasksIndexPageResult> {
    return new GetTasksIndexPageQuery(execCtx).execute(input)
  }

  async createTaskStatus(
    dto: CreateTaskStatusDTO,
    execCtx: ExecutionContext
  ): Promise<TaskStatusRecord> {
    return new CreateTaskStatusCommand(execCtx).execute(dto)
  }

  async getTasksList(options: TaskListPublicOptions, execCtx: ExecutionContext) {
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

    return new GetTasksListQuery(execCtx).execute(dto)
  }
}

export const taskPublicApi = new TaskPublicApi()
