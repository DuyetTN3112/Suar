export interface TaskOrganizationMembership {
  organizationId: string
  userId: string
  role: string | null
  status: string
}

export interface TaskOrganizationMembershipReader {
  findApprovedMembership(params: {
    organizationId: string
    userId: string
  }): Promise<TaskOrganizationMembership | null>
}
