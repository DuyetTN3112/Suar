import type { HttpContext } from '@adonisjs/core/http'

import { omitUndefined } from '#modules/contracts/public_contracts/optional_payload'
import { ORGANIZATION_PAGINATION as PAGINATION } from '#modules/organizations/invitations/actions/dtos/common/organization_pagination'
import type { InvitationsIndexPageInput } from '#modules/organizations/invitations/actions/query/get_invitations_index_page_query'
import { normalizePagination } from '#modules/pagination/public_contracts/pagination_public_api'
function toOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

export function buildInvitationsIndexPageInput(
  request: HttpContext['request']
): InvitationsIndexPageInput {
  const pagination = normalizePagination(
    {
      page: request.input('page', PAGINATION.DEFAULT_PAGE) as unknown,
    },
    PAGINATION
  )

  return omitUndefined({
    page: pagination.page,
    search: toOptionalString(request.input('search') as unknown),
    status: toOptionalString(request.input('status') as unknown),
  })
}
