import GetTasksListDTO from '../dtos/request/get_tasks_list_dto.js'

import GetTasksListQuery from './get_tasks_list_query.js'

import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/task_external_dependencies'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'

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
}

export default class GetTaskStatusBoardPageQuery {
  constructor(
    protected execCtx: TaskActionContext,
    private taskExternalDependencies: TaskExternalDependencies
  ) {}

  async execute(organizationId: string): Promise<GetTaskStatusBoardPageResult> {
    const dto = new GetTasksListDTO({
      page: DEFAULT_PAGE,
      limit: DEFAULT_LIMIT,
      organization_id: organizationId,
      sort_by: 'updated_at',
      sort_order: 'desc',
    })

    const list = await new GetTasksListQuery(this.execCtx, this.taskExternalDependencies).execute(dto)

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
