import type { OrganizationActionContext } from '#modules/organizations/actions/action_context'
import type ListTaskStatusesQuery from '#modules/organizations/actions/queries/workflow/list_task_statuses_query'

/**
 * Inbound construction contract for organization workflow reads.
 */
export abstract class OrganizationWorkflowQueryFactory {
  abstract makeListTaskStatuses(context: OrganizationActionContext): ListTaskStatusesQuery
}
