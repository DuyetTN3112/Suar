import type { CreateTaskStatusDTO } from '#actions/tasks/dtos/request/task_status_dtos'
import CreateTaskStatusCommand from '#actions/tasks/commands/create_task_status_command'
import type TaskStatus from '#models/task_status'
import type { ExecutionContext } from '#types/execution_context'

export default class CreateOrganizationTaskStatusCommand {
  constructor(protected execCtx: ExecutionContext) {}

  async execute(dto: CreateTaskStatusDTO): Promise<TaskStatus> {
    return new CreateTaskStatusCommand(this.execCtx).execute(dto)
  }
}
