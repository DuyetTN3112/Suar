export interface HttpOrganizationUser {
  id: string
  username: string
  email: string | null
}

export interface HttpOrganizationMembershipSummary {
  id: string
  name: string
  logo: string | null
  orgRole: string | null
  status: string | null
}

export abstract class HttpOrganizationReader {
  abstract listUsers(
    organizationId: string,
    excludeUserId: string
  ): Promise<HttpOrganizationUser[]>

  abstract listApprovedMembershipSummaries(
    userId: string
  ): Promise<HttpOrganizationMembershipSummary[]>
}
