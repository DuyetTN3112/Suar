import type { OrganizationActionContext } from '#modules/organizations/actions/action_context'
import type GetOrganizationTaskDetailQuery from '#modules/organizations/actions/queries/tasks/get_organization_task_detail_query'
import type GetOrganizationTasksIndexPageQuery from '#modules/organizations/actions/queries/tasks/get_organization_tasks_index_page_query'

/**
 * Inbound construction contract for the organization task compatibility surface.
 */
export abstract class OrganizationTaskQueryFactory {
  abstract makeIndexPage(context: OrganizationActionContext): GetOrganizationTasksIndexPageQuery
  abstract makeDetail(context: OrganizationActionContext): GetOrganizationTaskDetailQuery
}
