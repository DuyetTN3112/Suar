import type { OrganizationActionContext } from '#modules/organizations/workflow/actions/action_context'
import type { OrganizationTaskStatusCreateInput } from '#modules/organizations/workflow/actions/dtos/request/organization_task_status_create_input'
import type { OrganizationTaskStatusResult } from '#modules/organizations/workflow/actions/dtos/response/organization_task_status_result'

export abstract class OrganizationTaskStatusCreator {
  abstract create(
    input: OrganizationTaskStatusCreateInput,
    context: OrganizationActionContext
  ): Promise<OrganizationTaskStatusResult>
}
