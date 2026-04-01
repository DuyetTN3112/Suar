export abstract class AuthOrganizationMembershipReader {
  abstract findApprovedRole(organizationId: string, userId: string): Promise<string | null>
}
