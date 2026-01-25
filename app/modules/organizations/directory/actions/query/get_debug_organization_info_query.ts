import type { OrganizationUserReaderWriter } from '#modules/organizations/directory/actions/ports/outbound/organization_external_dependencies'

interface DebugOrgInfo {
  user_id: string
  username: string | null
  user_current_organization_id: string | null
  session_organization_id: string | undefined
  organizations: Record<string, unknown>[]
}

/**
 * Query: Get Debug Organization Info
 *
 * Loads user's organizations for debugging purposes.
 */
export default class GetDebugOrganizationInfoQuery {
  constructor(private readonly userReaderWriter: OrganizationUserReaderWriter) {}

  async execute(
    userId: string,
    sessionOrgId: string | undefined
  ): Promise<DebugOrgInfo> {
    const user = await this.userReaderWriter.loadDebugOrganizations(userId)

    return {
      user_id: user.id,
      username: user.username,
      user_current_organization_id: user.currentOrganizationId,
      session_organization_id: sessionOrgId,
      organizations: user.organizations,
    }
  }
}
