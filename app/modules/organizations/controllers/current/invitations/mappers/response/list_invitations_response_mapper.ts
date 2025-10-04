import type { InvitationsIndexPageResult } from '#modules/organizations/actions/current/invitations/queries/get_invitations_index_page_query'
import { toCanonicalPagePagination } from '#modules/pagination/public_contracts/pagination_public_api'

export function mapInvitationsIndexPageProps(pageData: InvitationsIndexPageResult) {
  return {
    ...pageData,
    pagination: toCanonicalPagePagination(pageData.pagination),
  }
}
