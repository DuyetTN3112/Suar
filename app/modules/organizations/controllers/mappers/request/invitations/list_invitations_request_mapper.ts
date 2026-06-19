import type { HttpContext } from '@adonisjs/core/http'

import { ORGANIZATION_PAGINATION as PAGINATION } from '#modules/organizations/actions/dtos/common/invitations/organization_pagination'
import type { InvitationsIndexPageInput } from '#modules/organizations/actions/queries/invitations/get_invitations_index_page_query'
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
