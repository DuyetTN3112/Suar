import type { OrganizationActionContext } from '#modules/organizations/tasks/actions/action_context'
import type { OrganizationTaskDetailPage } from '#modules/organizations/tasks/actions/dtos/response/organization_task_pages'
import type { OrganizationTaskDetailReader } from '#modules/organizations/tasks/actions/ports/outbound/organization_task_detail_reader'

export interface GetOrganizationTaskDetailInput {
  taskId: string
  organizationId: string
}

export default class GetOrganizationTaskDetailQuery {
  constructor(
    private readonly context: OrganizationActionContext,
    private readonly tasks: OrganizationTaskDetailReader
  ) {}

  execute(input: GetOrganizationTaskDetailInput): Promise<OrganizationTaskDetailPage> {
    return this.tasks.read(input.taskId, input.organizationId, this.context)
  }
}
