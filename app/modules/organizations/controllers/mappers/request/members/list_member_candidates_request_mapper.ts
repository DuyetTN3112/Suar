import type { HttpContext } from '@adonisjs/core/http'

import { ORGANIZATION_PAGINATION } from '#modules/organizations/actions/dtos/common/members/organization_pagination'
import type { OrganizationMemberCandidateQuery } from '#modules/organizations/actions/dtos/request/members/organization_member_candidate_query'
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
