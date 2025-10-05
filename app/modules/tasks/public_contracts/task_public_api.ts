import '#modules/tasks/bootstrap/task_composition_root'

import type {
  GetTasksIndexPageInput,
  GetTasksIndexPageResult,
} from '#modules/tasks/actions/queries/get_tasks_index_page_query'
import { TaskPublicApi, taskPublicApi } from '#modules/tasks/actions/services/task_public_api'
import type { TaskListPublicOptions } from '#modules/tasks/actions/services/task_public_api'

export { TaskPublicApi, taskPublicApi }
export type { CreateTaskStatusDTO } from '#modules/tasks/public_contracts/task_status_dtos'
export type { GetTasksIndexPageInput, GetTasksIndexPageResult, TaskListPublicOptions }
