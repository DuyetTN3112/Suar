import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import type { DatabaseId } from '#types/database'
import type Task from '#models/task'
import GetTasksListQuery from './get_tasks_list_query.js'
import GetTaskMetadataQuery from './get_task_metadata_query.js'
import type GetTasksListDTO from '../dtos/request/get_tasks_list_dto.js'

export interface TasksPageResult {
  tasksResult: {
    data: Task[]
    meta: {
      total: number
      per_page: number
      current_page: number
      last_page: number
      first_page: number
      next_page_url: string | null
      previous_page_url: string | null
    }
    stats?: {
      total: number
      by_status: Record<string, number>
    }
  }
  metadata: {
    statuses: Array<{ value: string; label: string }>
    labels: Array<{ value: string; label: string }>
    priorities: Array<{ value: string; label: string }>
    users: Array<{ id: DatabaseId; username: string; email: string }>
    parentTasks: Array<{ id: DatabaseId; title: string; status: string }>
  }
}

/**
 * Composite Query: Get Tasks Page Data
 *
 * Aggregates all data needed to render the tasks list page
 * by running GetTasksListQuery and GetTaskMetadataQuery in parallel.
 */
export default class GetTasksPageQuery {
  constructor(protected ctx: HttpContext) {}

  async execute(dto: GetTasksListDTO, organizationId: string): Promise<TasksPageResult> {
    const execCtx = ExecutionContext.fromHttp(this.ctx)

    const [tasksResult, metadata] = await Promise.all([
      new GetTasksListQuery(execCtx).execute(dto),
      new GetTaskMetadataQuery(execCtx).execute(organizationId),
    ])

    return { tasksResult, metadata }
  }
}
