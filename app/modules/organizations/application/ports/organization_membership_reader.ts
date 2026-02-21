export interface OrganizationMembershipSnapshot {
  organizationId: string
  userId: string
  role: string
  status: string
  approvedAt: string | null
}

export interface OrganizationMembershipReader {
  findMembership(params: {
    organizationId: string
    userId: string
  }): Promise<OrganizationMembershipSnapshot | null>
}
