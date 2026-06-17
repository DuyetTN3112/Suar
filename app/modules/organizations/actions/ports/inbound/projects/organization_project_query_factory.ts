import type { OrganizationActionContext } from '#modules/organizations/actions/action_context'
import type ListProjectsQuery from '#modules/organizations/actions/queries/projects/list_projects_query'

/**
 * Inbound construction contract for current-organization project reads.
 */
export abstract class OrganizationProjectQueryFactory {
  abstract makeListProjects(context: OrganizationActionContext): ListProjectsQuery
}
