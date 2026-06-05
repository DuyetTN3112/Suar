import type { OrganizationActionContext } from '#modules/organizations/actions/action_context'
import type { OrganizationTaskStatusCreateInput } from '#modules/organizations/actions/dtos/request/workflow/organization_task_status_create_input'
import type { OrganizationTaskStatusResult } from '#modules/organizations/actions/dtos/response/workflow/organization_task_status_result'

export abstract class OrganizationTaskStatusCreator {
  abstract create(
    input: OrganizationTaskStatusCreateInput,
    context: OrganizationActionContext
  ): Promise<OrganizationTaskStatusResult>
}
