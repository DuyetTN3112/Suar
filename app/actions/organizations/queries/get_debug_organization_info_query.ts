import UserRepository from '#infra/users/repositories/user_repository'
import type { DatabaseId } from '#types/database'

interface DebugOrgInfo {
  user_id: DatabaseId
  username: string | null
  user_current_organization_id: DatabaseId | null
  session_organization_id: string | undefined
  organizations: Record<string, unknown>[]
}

/**
 * Query: Get Debug Organization Info
 *
 * Loads user's organizations for debugging purposes.
 */
export default class GetDebugOrganizationInfoQuery {
  static async execute(
    userId: DatabaseId,
    sessionOrgId: string | undefined
  ): Promise<DebugOrgInfo> {
    const user = await UserRepository.findWithOrganizations(userId)

    return {
      user_id: user.id,
      username: user.username,
      user_current_organization_id: user.current_organization_id,
      session_organization_id: sessionOrgId,
      organizations: user.organizations.map((org) => org.serialize()),
    }
  }
}
