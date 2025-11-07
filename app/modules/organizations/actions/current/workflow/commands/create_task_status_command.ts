import type { OrganizationActionContext } from '#modules/organizations/actions/organization_action_context'
import { taskPublicApi, type CreateTaskStatusDTO } from '#modules/tasks/public_contracts/task_public_api'
import type { TaskStatusRecord } from '#modules/tasks/types/task_records'

export default class CreateOrganizationTaskStatusCommand {
  constructor(protected execCtx: OrganizationActionContext) {}

  async execute(dto: CreateTaskStatusDTO): Promise<TaskStatusRecord> {
    return taskPublicApi.createTaskStatus(dto, this.execCtx)
  }
}
