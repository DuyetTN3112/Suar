import type { OrganizationActionContext } from '#modules/organizations/actions/action_context'
import type { OrganizationTasksIndexPageInput } from '#modules/organizations/actions/dtos/request/tasks/organization_tasks_index_page_input'
import type { OrganizationTasksIndexPageResult } from '#modules/organizations/actions/dtos/response/tasks/organization_task_pages'

export abstract class OrganizationTaskIndexPageReader {
  abstract read(
    input: OrganizationTasksIndexPageInput,
    context: OrganizationActionContext
  ): Promise<OrganizationTasksIndexPageResult>
}
