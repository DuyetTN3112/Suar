import { taskPublicApi, type CreateTaskStatusDTO } from '#actions/tasks/public_api'
import type { ExecutionContext } from '#types/execution_context'
import type { TaskStatusRecord } from '#types/task_records'

export default class CreateOrganizationTaskStatusCommand {
  constructor(protected execCtx: ExecutionContext) {}

  async execute(dto: CreateTaskStatusDTO): Promise<TaskStatusRecord> {
    return taskPublicApi.createTaskStatus(dto, this.execCtx)
  }
}
