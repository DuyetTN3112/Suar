import { omitUndefined } from '#modules/contracts/public_contracts/optional_payload'
import type { RequiredOrganizationDirectoryReader } from '#modules/errors/actions/ports/outbound/required_organization_directory_reader'
import {
  definePaginationPolicy,
  toCanonicalPagePagination,
  toPageNumber,
} from '#modules/pagination/public_contracts/pagination_public_api'

export interface GetRequiredOrganizationPageInput {
  userId: string
  page?: unknown
  search?: unknown
}

const REQUIRED_ORGANIZATION_PAGINATION = definePaginationPolicy()

export default class GetRequiredOrganizationPageQuery {
  constructor(private readonly organizations: RequiredOrganizationDirectoryReader) {}

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
