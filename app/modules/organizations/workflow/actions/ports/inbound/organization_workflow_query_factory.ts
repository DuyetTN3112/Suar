import type { OrganizationActionContext } from '#modules/organizations/workflow/actions/action_context'
import type ListTaskStatusesQuery from '#modules/organizations/workflow/actions/query/list_task_statuses_query'

/**
 * Inbound construction contract for organization workflow reads.
 */
export abstract class OrganizationWorkflowQueryFactory {
  abstract makeListTaskStatuses(context: OrganizationActionContext): ListTaskStatusesQuery
}
