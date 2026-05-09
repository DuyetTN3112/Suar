import { OrganizationRouteAccessReader } from '#modules/organizations/actions/ports/inbound/access/organization_route_access_reader'
import type { OrganizationTransaction } from '#modules/organizations/actions/ports/outbound/organization_transaction'
import { hasOrganizationRolePermission } from '#modules/organizations/domain/access/org_access_rules'
import type {
  OrganizationMembershipRepository,
  OrganizationReader,
} from '#modules/organizations/actions/ports/outbound/directory/organization_persistence'

export class OrganizationRouteAccessReaderAdapter extends OrganizationRouteAccessReader {
  constructor(
    private readonly organizations: OrganizationReader,
    private readonly memberships: OrganizationMembershipRepository
  ) {
    super()
  }

  findApprovedMembership(
    organizationId: string,
    userId: string,
    transaction?: OrganizationTransaction
  ) {
    return this.memberships.findApprovedContext(organizationId, userId, transaction)
  }

  findFirstApprovedMembership(userId: string, transaction?: OrganizationTransaction) {
    return this.memberships.findFirstApprovedContext(userId, transaction)
  }

  async checkPermission(
    userId: string,
    organizationId: string,
    permission: string,
    transaction?: OrganizationTransaction
  ): Promise<boolean> {
    const membership = await this.memberships.find(organizationId, userId, transaction)
    if (!membership || membership.status !== 'approved') {
      return false
    }

    const organization = await this.organizations.findById(organizationId, transaction)
    if (!organization || organization.deleted_at) {
      return false
    }

    return hasOrganizationRolePermission(membership.org_role, organization.custom_roles, permission)
  }
}
