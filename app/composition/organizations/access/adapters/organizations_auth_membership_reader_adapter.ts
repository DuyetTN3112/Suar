import { organizationRouteAccessReader } from '#composition/organizations/access/organization_access_read_composition'
import { AuthOrganizationMembershipReader } from '#modules/auth/actions/ports/outbound/auth_organization_membership_reader'

export class OrganizationsAuthMembershipReaderAdapter extends AuthOrganizationMembershipReader {
  async findApprovedRole(organizationId: string, userId: string): Promise<string | null> {
    const membership = await organizationRouteAccessReader.findApprovedMembership(
      organizationId,
      userId
    )
    return membership?.role ?? null
  }
}
