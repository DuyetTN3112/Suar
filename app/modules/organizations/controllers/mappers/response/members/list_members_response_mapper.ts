import type { OrganizationMembersIndexPageResult } from '#modules/organizations/actions/queries/members/get_organization_members_index_page_query'
import { toCanonicalPagePagination } from '#modules/pagination/public_contracts/pagination_public_api'

export function mapOrganizationMembersIndexPageProps(pageData: OrganizationMembersIndexPageResult) {
  return {
    members: pageData.members,
    pagination: toCanonicalPagePagination(pageData.meta),
    filters: pageData.filters,
    roleOptions: pageData.roleOptions,
  }
}
