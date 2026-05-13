import type { HttpContext } from '@adonisjs/core/http'

import type { InvitationsIndexPageInput } from '#actions/organizations/current/invitations/queries/get_invitations_index_page_query'
import { PAGINATION } from '#modules/common/constants/common_constants'

function toPageNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(1, Math.trunc(value))
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return Math.max(1, Math.trunc(parsed))
    }
  }

  return 1
}

function toOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

export function buildInvitationsIndexPageInput(
  request: HttpContext['request']
): InvitationsIndexPageInput {
  return {
    page: toPageNumber(request.input('page', PAGINATION.DEFAULT_PAGE) as unknown),
    search: toOptionalString(request.input('search') as unknown),
    status: toOptionalString(request.input('status') as unknown),
  }
}
