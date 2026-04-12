import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'
import type { DatabaseId } from '#types/database'

interface MemberData {
  id: DatabaseId
  username: string
  email: string
  org_role: string
  role_name: string
}

interface ShowOrganizationResult {
  members: MemberData[]
  userRole: string
}

/**
 * Query: Get Organization Show Data
 *
 * Returns members preview and user's role for the organization show page.
 * Works alongside GetOrganizationDetailQuery for the full show page data.
 */
export default class GetOrganizationShowDataQuery {
  /**
   * Get members list and user's role for the show page.
   */
  async execute(organizationId: DatabaseId, userId: DatabaseId): Promise<ShowOrganizationResult> {
    // Members preview with user preload
    const membersPreview =
      await OrganizationUserRepository.findMembersWithUserProfile(organizationId)

    const members = membersPreview.map((m) => ({
      id: m.user.id,
      username: m.user.username,
      email: m.user.email ?? '',
      org_role: m.org_role,
      role_name: m.org_role,
    }))

    // User's role in this organization
    const userOrgRole = await OrganizationUserRepository.getMemberRoleName(
      organizationId,
      userId,
      undefined,
      false
    )

    return {
      members,
      userRole: userOrgRole ?? '',
    }
  }
}
