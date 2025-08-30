import type { OrganizationMembersPageFilters } from '#actions/organizations/queries/get_organization_members_page_query'

export function mapOrganizationsIndexPageProps(input: {
  organizations: unknown
  pagination: unknown
  currentOrganizationId: string | null | undefined
  allOrganizations: unknown
}) {
  return {
    organizations: input.organizations,
    pagination: input.pagination,
    currentOrganizationId: input.currentOrganizationId,
    allOrganizations: input.allOrganizations,
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
