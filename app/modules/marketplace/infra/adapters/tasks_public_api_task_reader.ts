import type { TaskReaderPort } from '../../application/ports/task_reader_port.js'

import {
  fromLegacySnakePagination,
  toCanonicalPagePagination,
} from '#modules/pagination/public_contracts/pagination_public_api'
import {
  listPublicTasks,
  type PublicTaskListingResult,
} from '#modules/tasks/public_contracts/public_task_listing'

type PublicTaskRecord = PublicTaskListingResult['data'][number]

function taskReaderContext(userId: string | null) {
  return {
    userId,
    ip: '0.0.0.0',
    userAgent: 'marketplace-task-reader',
    organizationId: null,
    requestId: null,
    traceId: null,
    workflowId: null,
  }
}

export class TasksPublicApiTaskReader implements TaskReaderPort {
  public async getMarketplaceTaskDetails(taskId: string): Promise<{
    id: string
    projectId: string
    title: string
    description: string
    status: string
    requiredSkills?: string[]
    visibility: 'external' | 'all'
  } | null> {
    const result = await listPublicTasks(
      {
        task_ids: [taskId],
        keyword: null,
        difficulty: null,
        skill_ids: null,
        sort_by: 'created_at',
        sort_order: 'desc',
        page: 1,
        per_page: 1,
      },
      taskReaderContext(null)
    )
    const task = result.data[0]

    if (!task || task.id !== taskId) {
      return null
    }

    return this.mapMarketplaceTask(task)
  }

  public async listEligibleTasks(params: {
    viewerId: string
    organizationId?: string
    skillTags?: string[]
    limit?: number
    offset?: number
  }): Promise<{
    data: { id: string; title: string; projectId: string }[]
    pagination: ReturnType<typeof toCanonicalPagePagination>
  }> {
    const perPage = Math.max(params.limit ?? 20, 1)
    const page = Math.floor((params.offset ?? 0) / perPage) + 1
    const result = await listPublicTasks(
      {
        task_ids: null,
        keyword: null,
        difficulty: null,
        skill_ids: null,
        sort_by: 'created_at',
        sort_order: 'desc',
        page,
        per_page: perPage,
      },
      taskReaderContext(params.viewerId)
    )

    return {
      data: result.data.map((task) => ({
        id: task.id,
        title: task.title,
        projectId: task.project_id ?? '',
      })),
      pagination: toCanonicalPagePagination(fromLegacySnakePagination(result.meta)),
    }
  }

  private mapMarketplaceTask(task: PublicTaskRecord): {
    id: string
    projectId: string
    title: string
    description: string
    status: string
    requiredSkills?: string[]
    visibility: 'external' | 'all'
  } {
    return {
      id: task.id,
      projectId: task.project_id ?? '',
      title: task.title,
      description: task.description,
      status: task.status,
      requiredSkills: [],
      visibility: task.task_visibility === 'all' ? 'all' : 'external',
    }
  }
}
