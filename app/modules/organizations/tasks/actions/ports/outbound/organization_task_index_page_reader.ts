import type { OrganizationActionContext } from '#modules/organizations/tasks/actions/action_context'
import type { OrganizationTasksIndexPageInput } from '#modules/organizations/tasks/actions/dtos/request/organization_tasks_index_page_input'
import type { OrganizationTasksIndexPageResult } from '#modules/organizations/tasks/actions/dtos/response/organization_task_pages'

export abstract class OrganizationTaskIndexPageReader {
  abstract read(
    input: OrganizationTasksIndexPageInput,
    context: OrganizationActionContext
  ): Promise<OrganizationTasksIndexPageResult>
}
