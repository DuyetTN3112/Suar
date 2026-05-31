import { BaseQuery } from '#modules/errors/actions/base_query'
import type { RequiredOrganizationDirectoryReader } from '#modules/errors/actions/ports/outbound/required_organization_directory_reader'
import {
  definePaginationPolicy,
  toCanonicalPagePagination,
  toPageNumber,
} from '#modules/pagination/public_contracts/pagination_public_api'

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


export interface GetRequiredOrganizationPageInput {
  userId: string
  page?: unknown
  search?: unknown
}

const REQUIRED_ORGANIZATION_PAGINATION = definePaginationPolicy()

export default class GetRequiredOrganizationPageQuery extends BaseQuery<
  [input: GetRequiredOrganizationPageInput],
  {
    organizations: Awaited<ReturnType<RequiredOrganizationDirectoryReader['getMembershipDirectoryPage']>>['data']
    pagination: ReturnType<typeof toCanonicalPagePagination>
    filters: { search: string }
  }
> {
  constructor(private readonly organizations: RequiredOrganizationDirectoryReader) {
    super()
  }

  async execute(input: GetRequiredOrganizationPageInput) {
    const search = normalizeOptionalSearch(input.search)
    const page = toPageNumber(input.page, REQUIRED_ORGANIZATION_PAGINATION.DEFAULT_PAGE)
    const result = await this.organizations.getMembershipDirectoryPage(
      omitUndefined({
        userId: input.userId,
        page,
        perPage: REQUIRED_ORGANIZATION_PAGINATION.DEFAULT_PER_PAGE,
        search,
      })
    )

    return {
      organizations: result.data,
      pagination: toCanonicalPagePagination(result.meta),
      filters: {
        search: search ?? '',
      },
    }
  }
}

function normalizeOptionalSearch(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}
