import type { OrganizationActionContext } from '#modules/organizations/actions/action_context'
import type { OrganizationTasksIndexPageInput } from '#modules/organizations/actions/dtos/request/tasks/organization_tasks_index_page_input'
import type { OrganizationTasksIndexPageResult } from '#modules/organizations/actions/dtos/response/tasks/organization_task_pages'
import type { OrganizationTaskIndexPageReader } from '#modules/organizations/actions/ports/outbound/tasks/organization_task_index_page_reader'

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
