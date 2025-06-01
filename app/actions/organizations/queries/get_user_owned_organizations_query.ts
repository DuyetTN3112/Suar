import OrganizationUser from '#models/organization_user'
import Organization from '#models/organization'
import { OrganizationRole, OrganizationUserStatus } from '#constants/organization_constants'
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
  static async execute(userId: DatabaseId): Promise<OwnedOrg[]> {
    const memberships = await OrganizationUser.query()
      .where('user_id', userId)
      .where('org_role', OrganizationRole.OWNER)
      .where('status', OrganizationUserStatus.APPROVED)
      .select('organization_id')

    const orgIds = memberships.map((m) => String(m.organization_id))
    if (orgIds.length === 0) return []

    const orgs = await Organization.query()
      .whereIn('id', orgIds)
      .whereNull('deleted_at')
      .select('id', 'name')

    return orgs.map((o) => ({ id: o.id, name: o.name }))
  }
}
