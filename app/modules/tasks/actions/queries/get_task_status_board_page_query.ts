import GetTasksListDTO from '../dtos/request/get_tasks_list_dto.js'

import type { CanonicalPagePagination } from '#modules/pagination/public_contracts/pagination_public_api'
import { toCanonicalPagePagination } from '#modules/pagination/public_contracts/pagination_public_api'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/task_external_dependencies'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { makeGetTasksListQuery } from '#modules/tasks/bootstrap/task_query_factory'

const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 20

export interface GetTaskStatusBoardPageResult {
  items: {
    id: string
    name: string
    createdById: string
  }[]
  metadata: {
    total: number
  }
  pagination: CanonicalPagePagination
}

export default class GetTaskStatusBoardPageQuery {
  constructor(
    protected execCtx: TaskActionContext,
    private taskExternalDependencies: TaskExternalDependencies
  ) {}

  async execute(
    organizationId: string,
    input: { page?: number; limit?: number } = {}
  ): Promise<GetTaskStatusBoardPageResult> {
    const dto = new GetTasksListDTO({
      page: input.page ?? DEFAULT_PAGE,
      limit: input.limit ?? DEFAULT_LIMIT,
      organization_id: organizationId,
      sort_by: 'updated_at',
      sort_order: 'desc',
    })

    const list = await makeGetTasksListQuery(this.execCtx, this.taskExternalDependencies).execute(dto)

    return {
      items: list.data.map((task) => ({
        id: task.id,
        name: task.title,
        createdById: task.creator_id,
      })),
      metadata: {
        total: list.meta.total,
      },
      pagination: toCanonicalPagePagination({
        total: list.meta.total,
        perPage: list.meta.per_page,
        currentPage: list.meta.current_page,
        lastPage: list.meta.last_page,
      }),
    }
  }
}
