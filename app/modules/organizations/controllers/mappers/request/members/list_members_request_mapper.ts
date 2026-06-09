import type { HttpContext } from '@adonisjs/core/http'

import { ORGANIZATION_PAGINATION } from '#modules/organizations/actions/dtos/common/members/organization_pagination'
import type { OrganizationMembersIndexPageInput } from '#modules/organizations/actions/queries/members/get_organization_members_index_page_query'
import { normalizePagination } from '#modules/pagination/public_contracts/pagination_public_api'

type OptionalPayloadKeys<T extends object> = {
  [Key in keyof T]-?: undefined extends T[Key] ? Key : never
}[keyof T]

type OmittedUndefined<T extends object> = {
  [Key in keyof T as Key extends OptionalPayloadKeys<T> ? never : Key]: T[Key]
} & {
  [Key in OptionalPayloadKeys<T>]?: Exclude<T[Key], undefined>
}

function omitUndefined<T extends object>(value: T): OmittedUndefined<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  ) as OmittedUndefined<T>
}

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
