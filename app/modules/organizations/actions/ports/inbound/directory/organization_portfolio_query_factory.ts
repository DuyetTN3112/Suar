import type { OrganizationActionContext } from '#modules/organizations/actions/action_context'
import type GetOrganizationDetailQuery from '#modules/organizations/actions/queries/directory/get_organization_detail_query'
import type GetOrganizationShowPageQuery from '#modules/organizations/actions/queries/directory/get_organization_show_page_query'
import type GetOrganizationsIndexPageQuery from '#modules/organizations/actions/queries/directory/get_organizations_index_page_query'

/**
 * Inbound construction contract for organization portfolio reads.
 */
export abstract class OrganizationPortfolioQueryFactory {
  abstract makeDetail(context: OrganizationActionContext): GetOrganizationDetailQuery
  abstract makeShowPage(context: OrganizationActionContext): GetOrganizationShowPageQuery
  abstract makeIndexPage(context: OrganizationActionContext): GetOrganizationsIndexPageQuery
}
