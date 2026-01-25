import type { OrganizationActionContext } from '#modules/organizations/workflow/actions/action_context'
import type { OrganizationTaskStatusCreateInput } from '#modules/organizations/workflow/actions/dtos/request/organization_task_status_create_input'
import type { OrganizationTaskStatusCreator } from '#modules/organizations/workflow/actions/ports/outbound/organization_task_status_creator'

export default class CreateOrganizationTaskStatusCommand {
  constructor(
    protected execCtx: OrganizationActionContext,
    private readonly creator: OrganizationTaskStatusCreator
  ) {}

  async execute(dto: OrganizationTaskStatusCreateInput) {
    return this.creator.create(dto, this.execCtx)
  }
}
