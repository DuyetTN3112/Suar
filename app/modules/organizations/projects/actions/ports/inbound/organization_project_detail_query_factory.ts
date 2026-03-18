import type { OrganizationActionContext } from '#modules/organizations/projects/actions/action_context'
import type GetOrganizationProjectDetailQuery from '#modules/organizations/projects/actions/query/get_organization_project_detail_query'

/**
 * Inbound construction contract for current-organization project detail.
 */
export abstract class OrganizationProjectDetailQueryFactory {
  abstract make(context: OrganizationActionContext): GetOrganizationProjectDetailQuery
}
