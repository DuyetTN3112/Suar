import type { OrganizationActionContext } from '#modules/organizations/directory/actions/organization_action_context'
import type { OrganizationTasksIndexPageInput } from '#modules/organizations/tasks/actions/dtos/request/organization_tasks_index_page_input'
import type { OrganizationTasksIndexPageResult } from '#modules/organizations/tasks/actions/dtos/response/organization_task_pages'
import { OrganizationTaskIndexPageReader } from '#modules/organizations/tasks/actions/ports/outbound/organization_task_index_page_reader'
import type { TaskBoardQueryFactory } from '#modules/tasks/actions/ports/inbound/task_board_query_factory'

export class TasksOrganizationTaskIndexPageReaderAdapter extends OrganizationTaskIndexPageReader {
  constructor(private readonly queries: TaskBoardQueryFactory) {
    super()
  }

  read(
    input: OrganizationTasksIndexPageInput,
    context: OrganizationActionContext
  ): Promise<OrganizationTasksIndexPageResult> {
    if (!context.organizationId) {
      throw new Error('Organization task index requires an organization context')
    }

    return this.queries.makeIndexPage(context).execute({
      ...input,
      organization_id: context.organizationId,
    })
  }
}
