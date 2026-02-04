import type { OrganizationActionContext } from '#modules/organizations/directory/actions/organization_action_context'
import type GetOrganizationDetailQuery from '#modules/organizations/directory/actions/query/get_organization_detail_query'
import type GetOrganizationShowPageQuery from '#modules/organizations/directory/actions/query/get_organization_show_page_query'
import type GetOrganizationsIndexPageQuery from '#modules/organizations/directory/actions/query/get_organizations_index_page_query'

/**
 * Inbound construction contract for organization portfolio reads.
 */
export abstract class OrganizationPortfolioQueryFactory {
  abstract makeDetail(context: OrganizationActionContext): GetOrganizationDetailQuery
  abstract makeShowPage(context: OrganizationActionContext): GetOrganizationShowPageQuery
  abstract makeIndexPage(context: OrganizationActionContext): GetOrganizationsIndexPageQuery
}
