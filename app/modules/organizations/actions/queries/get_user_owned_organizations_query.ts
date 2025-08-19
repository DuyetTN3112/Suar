import * as membershipQueries from '#modules/organizations/infra/repositories/organization_user_repository/read/membership_queries'
import OrganizationRepository from '#modules/organizations/infra/repositories/read/organization_repository'

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
  private readonly __instanceMarker = true

  static {
    void new GetUserOwnedOrganizationsQuery().__instanceMarker
  }

  static async execute(userId: string): Promise<OwnedOrg[]> {
    const orgIds = await membershipQueries.findOwnerMembershipIds(userId)
    if (orgIds.length === 0) return []

    const orgs = await OrganizationRepository.findActiveByIds(orgIds, ['id', 'name'])

    return orgs.map((o) => ({ id: o.id, name: o.name }))
  }
}
