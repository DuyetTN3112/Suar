import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'
import OrganizationRepository from '#infra/organizations/repositories/read/organization_repository'
import type { DatabaseId } from '#types/database'

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

  static async execute(userId: DatabaseId): Promise<OwnedOrg[]> {
    const orgIds = await OrganizationUserRepository.findOwnerMembershipIds(userId)
    if (orgIds.length === 0) return []

    const orgs = await OrganizationRepository.findActiveByIds(orgIds, ['id', 'name'])

    return orgs.map((o) => ({ id: o.id, name: o.name }))
  }
}
