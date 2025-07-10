import type GetTasksListDTO from '../dtos/request/get_tasks_list_dto.js'
import type { TaskListQueryRecord } from '../mapper/task_query_output_mapper.js'

import GetTaskMetadataQuery from './get_task_metadata_query.js'
import GetTasksListQuery from './get_tasks_list_query.js'

import type { DatabaseId } from '#types/database'
import type { ExecutionContext } from '#types/execution_context'

export interface TasksPageResult {
  tasksResult: {
    data: TaskListQueryRecord[]
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
    statuses: {
      id: string
      value: string
      label: string
      slug: string
      category: string
      color?: string
      is_system: boolean
    }[]
    labels: { value: string; label: string }[]
    priorities: { value: string; label: string }[]
    users: { id: DatabaseId; username: string; email: string }[]
    parentTasks: { id: DatabaseId; title: string; task_status_id: string | null }[]
    projects: { id: DatabaseId; name: string }[]
  }
}

/**
 * Composite Query: Get Tasks Page Data
 *
 * Aggregates all data needed to render the tasks list page
 * by running GetTasksListQuery and GetTaskMetadataQuery in parallel.
 */
export default class GetTasksPageQuery {
  constructor(protected execCtx: ExecutionContext) {}

  async execute(dto: GetTasksListDTO, organizationId: string): Promise<TasksPageResult> {
    const [tasksResult, metadata] = await Promise.all([
      new GetTasksListQuery(this.execCtx).execute(dto),
      new GetTaskMetadataQuery(this.execCtx).execute(organizationId),
    ])

    return { tasksResult, metadata }
  }
}
