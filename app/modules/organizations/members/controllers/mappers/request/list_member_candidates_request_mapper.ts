import type { HttpContext } from '@adonisjs/core/http'

import { omitUndefined } from '#modules/contracts/public_contracts/optional_payload'
import { ORGANIZATION_PAGINATION } from '#modules/organizations/members/actions/dtos/common/organization_pagination'
import type { OrganizationMemberCandidateQuery } from '#modules/organizations/members/actions/dtos/request/organization_member_candidate_query'
import { normalizePagination } from '#modules/pagination/public_contracts/pagination_public_api'

const MEMBER_CANDIDATES_PER_PAGE = 10

function toOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

export function buildOrganizationMemberCandidateQuery(
  request: HttpContext['request'],
  organizationId: string
): OrganizationMemberCandidateQuery {
  const pagination = normalizePagination(
    {
      page: request.input('page'),
      limit: request.input('limit'),
    },
    ORGANIZATION_PAGINATION,
    { perPage: MEMBER_CANDIDATES_PER_PAGE }
  )

  return omitUndefined({
    organizationId,
    page: pagination.page,
    perPage: pagination.perPage,
    search: toOptionalString(request.input('search')),
  })
}
