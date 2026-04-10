import type { HttpContext } from '@adonisjs/core/http'
import { PAGINATION } from '#constants/common_constants'
import type { InvitationsIndexPageInput } from '#actions/organization/invitations/queries/get_invitations_index_page_query'

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
