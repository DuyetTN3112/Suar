export interface OrganizationMembershipV1 {
  organizationId: string
  userId: string
  role: string
  status: string
  approvedAt: string | null
}
