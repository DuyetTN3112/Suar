import type { OrganizationMembersPageFilters } from '#modules/organizations/members/actions/query/get_organization_members_page_query'
import { toCanonicalPagePagination } from '#modules/pagination/public_contracts/pagination_public_api'

function toJoinedOrganizationsPagination(meta: {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage?: boolean
  hasPrevPage?: boolean
}) {
  return {
    mode: 'offset' as const,
    page: meta.page,
    perPage: meta.limit,
    total: meta.total,
    lastPage: meta.totalPages,
    hasNextPage: meta.hasNextPage ?? meta.page < meta.totalPages,
    hasPreviousPage: meta.hasPrevPage ?? meta.page > 1,
  }
}

export function mapOrganizationsIndexPageProps(input: {
  joinedOrganizations: unknown
  joinedPagination: unknown
  availableOrganizations: unknown
  availablePagination: unknown
  currentOrganizationId: string | null | undefined
  filters: {
    tab?: string
    search?: string
  }
}) {
  return {
    joinedOrganizations: input.joinedOrganizations,
    joinedPagination: toJoinedOrganizationsPagination(
      input.joinedPagination as Parameters<typeof toJoinedOrganizationsPagination>[0]
    ),
    availableOrganizations: input.availableOrganizations,
    availablePagination: toCanonicalPagePagination(
      input.availablePagination as Parameters<typeof toCanonicalPagePagination>[0]
    ),
    currentOrganizationId: input.currentOrganizationId,
    filters: {
      tab: input.filters.tab ?? 'joined',
      search: input.filters.search ?? '',
    },
  }
}

export function mapOrganizationMembersPageProps(input: {
  organization: unknown
  members: unknown
  roles: unknown
  userRole: unknown
  pendingRequests: unknown
  filters: Pick<OrganizationMembersPageFilters, 'search' | 'roleId' | 'statusFilter' | 'include'>
}) {
  return {
    organization: input.organization,
    members: input.members,
    roles: input.roles,
    userRole: input.userRole,
    pendingRequests: input.pendingRequests,
    filters: {
      search: input.filters.search ?? '',
      status: input.filters.statusFilter ?? undefined,
      roleId: input.filters.roleId ?? undefined,
      include: input.filters.include ?? [],
    },
  }
}
