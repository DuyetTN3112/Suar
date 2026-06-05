export interface OrganizationMemberListFilters {
  search?: string
  orgRole?: string
  status?: string
  userIds?: string[]
}

export interface OrganizationMemberListResult {
  members: {
    user_id: string
    username: string
    email: string | null
    org_role: string
    status: string
    invited_by: string | null
    created_at: Date
  }[]
  total: number
}

export interface OrganizationMemberStats {
  total: number
  byRole: {
    org_owner: number
    org_admin: number
    org_member: number
  }
  pendingInvitations: number
}

export abstract class OrganizationAdministrationRepository {
  abstract listMembers(
    organizationId: string,
    filters: OrganizationMemberListFilters,
    page: number,
    perPage: number
  ): Promise<OrganizationMemberListResult>
  abstract getMemberStats(organizationId: string): Promise<OrganizationMemberStats>
  abstract getRoleDistribution(organizationId: string): Promise<Map<string, number>>
  abstract listInvitations(
    organizationId: string,
    filters: { search?: string; status?: string },
    page: number,
    perPage: number
  ): Promise<{
    invitations: {
      id: string
      email: string
      org_role: string
      invited_by: { id: string; username: string }
      status: 'pending' | 'accepted' | 'declined' | 'expired'
      invited_at: string
      expires_at: string
    }[]
    total: number
  }>
}
