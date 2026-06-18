import type {
  OrganizationMembershipRepository,
  OrganizationReader,
} from '#modules/organizations/actions/ports/outbound/directory/organization_persistence'

interface OwnedOrg {
  id: string
  name: string
}

/**
 * Query: Get User Owned Organizations
 *
 * Returns organizations where the user is an approved owner.
 * Used by project creation form to populate the organization dropdown.
 */
export default class GetUserOwnedOrganizationsQuery {
  constructor(
    private readonly organizations: OrganizationReader,
    private readonly memberships: OrganizationMembershipRepository
  ) {}

  async execute(userId: string): Promise<OwnedOrg[]> {
    const orgIds = await this.memberships.findOwnerOrganizationIds(userId)
    if (orgIds.length === 0) return []

    const orgs = await this.organizations.findActiveByIds(orgIds, ['id', 'name'])

    return orgs.map((o) => ({ id: o.id, name: o.name }))
  }
}
