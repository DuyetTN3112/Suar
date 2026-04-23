import type { OrganizationActionContext } from '#modules/organizations/actions/action_context'
import { OrganizationTaskQueryFactory } from '#modules/organizations/actions/ports/inbound/tasks/organization_task_query_factory'
import type { OrganizationTaskDetailReader } from '#modules/organizations/actions/ports/outbound/tasks/organization_task_detail_reader'
import type { OrganizationTaskIndexPageReader } from '#modules/organizations/actions/ports/outbound/tasks/organization_task_index_page_reader'
import GetOrganizationTaskDetailQuery from '#modules/organizations/actions/queries/tasks/get_organization_task_detail_query'
import GetOrganizationTasksIndexPageQuery from '#modules/organizations/actions/queries/tasks/get_organization_tasks_index_page_query'

export class ComposedOrganizationTaskQueryFactory extends OrganizationTaskQueryFactory {
  constructor(
    private readonly indexPages: OrganizationTaskIndexPageReader,
    private readonly details: OrganizationTaskDetailReader
  ) {
    super()
  }

  makeIndexPage(context: OrganizationActionContext): GetOrganizationTasksIndexPageQuery {
    return new GetOrganizationTasksIndexPageQuery(context, this.indexPages)
  }

  makeDetail(context: OrganizationActionContext): GetOrganizationTaskDetailQuery {
    return new GetOrganizationTaskDetailQuery(context, this.details)
  }
}
