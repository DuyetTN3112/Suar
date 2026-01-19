import type { OrganizationActionContext } from '#modules/organizations/tasks/actions/action_context'
import type { OrganizationTasksIndexPageInput } from '#modules/organizations/tasks/actions/dtos/request/organization_tasks_index_page_input'
import type { OrganizationTasksIndexPageResult } from '#modules/organizations/tasks/actions/dtos/response/organization_task_pages'
import type { OrganizationTaskIndexPageReader } from '#modules/organizations/tasks/actions/ports/outbound/organization_task_index_page_reader'

export default class GetOrganizationTasksIndexPageQuery {
  constructor(
    protected execCtx: OrganizationActionContext,
    private readonly reader: OrganizationTaskIndexPageReader
  ) {}

  async execute(
    input: OrganizationTasksIndexPageInput
  ): Promise<OrganizationTasksIndexPageResult> {
    return this.reader.read(input, this.execCtx)
  }
}
