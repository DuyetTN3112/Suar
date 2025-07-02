import type { ExecutionContext } from '#types/execution_context'
import type { DatabaseId } from '#types/database'
import GetTasksListDTO from '../dtos/request/get_tasks_list_dto.js'
import GetTasksListQuery from './get_tasks_list_query.js'

const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 20

export interface GetTaskStatusBoardPageResult {
  items: Array<{
    id: DatabaseId
    name: string
    createdById: DatabaseId
  }>
  metadata: {
    total: number
  }
}

export default class GetTaskStatusBoardPageQuery {
  constructor(protected execCtx: ExecutionContext) {}

  async execute(organizationId: DatabaseId): Promise<GetTaskStatusBoardPageResult> {
    const dto = new GetTasksListDTO({
      page: DEFAULT_PAGE,
      limit: DEFAULT_LIMIT,
      organization_id: organizationId,
      sort_by: 'updated_at',
      sort_order: 'desc',
    })

    const list = await new GetTasksListQuery(this.execCtx).execute(dto)

    return {
      items: list.data.map((task) => ({
        id: task.id,
        name: task.title,
        createdById: task.creator_id,
      })),
      metadata: {
        total: list.meta.total,
      },
    }
  }
}
