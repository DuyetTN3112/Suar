import type { HttpContext } from '@adonisjs/core/http'

import { omitUndefined } from '#modules/contracts/public_contracts/optional_payload'
import { ORGANIZATION_PAGINATION } from '#modules/organizations/members/actions/dtos/common/organization_pagination'
import type { OrganizationMembersIndexPageInput } from '#modules/organizations/members/actions/query/get_organization_members_index_page_query'
import { normalizePagination } from '#modules/pagination/public_contracts/pagination_public_api'
const ORG_MEMBERS_PER_PAGE = 50

function toOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

export function buildOrganizationMembersIndexPageInput(
  request: HttpContext['request'],
  organizationId: string
): OrganizationMembersIndexPageInput {
  const qs = request.qs() as Record<string, unknown>
  const pagination = normalizePagination(
    {
      page: qs['page'],
      perPage: ORG_MEMBERS_PER_PAGE,
    },
    ORGANIZATION_PAGINATION,
    { perPage: ORG_MEMBERS_PER_PAGE }
  )

  return omitUndefined({
    organizationId,
    page: pagination.page,
    perPage: pagination.perPage,
    search: toOptionalString(qs['search']),
    orgRole: toOptionalString(qs['org_role']),
    status: toOptionalString(qs['status']),
  })
}
