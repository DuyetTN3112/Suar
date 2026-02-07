import { DefaultOrganizationDependencies } from '../ports/organization_external_dependencies_impl.js'

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
  private readonly __instanceMarker = true

  static {
    void new GetDebugOrganizationInfoQuery().__instanceMarker
  }

  static async execute(
    userId: DatabaseId,
    sessionOrgId: string | undefined
  ): Promise<DebugOrgInfo> {
    const user = await DefaultOrganizationDependencies.user.loadDebugOrganizations(userId)

    return {
      user_id: user.id,
      username: user.username,
      user_current_organization_id: user.currentOrganizationId,
      session_organization_id: sessionOrgId,
      organizations: user.organizations,
    }
  }
}
