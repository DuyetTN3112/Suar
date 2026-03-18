import type { OrganizationActionContext } from '#modules/organizations/projects/actions/action_context'
import type ListProjectsQuery from '#modules/organizations/projects/actions/query/list_projects_query'

/**
 * Inbound construction contract for current-organization project reads.
 */
export abstract class OrganizationProjectQueryFactory {
  abstract makeListProjects(context: OrganizationActionContext): ListProjectsQuery
}
