import type { HttpContext } from '@adonisjs/core/http'

import type { OrganizationMembersIndexPageInput } from '#actions/organization/members/queries/get_organization_members_index_page_query'

const ORG_MEMBERS_PER_PAGE = 50

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

export function buildOrganizationMembersIndexPageInput(
  request: HttpContext['request'],
  organizationId: string
): OrganizationMembersIndexPageInput {
  const qs = request.qs() as Record<string, unknown>

  return {
    organizationId,
    page: toPageNumber(qs.page),
    perPage: ORG_MEMBERS_PER_PAGE,
    search: toOptionalString(qs.search),
    orgRole: toOptionalString(qs.org_role),
    status: toOptionalString(qs.status),
  }
}
