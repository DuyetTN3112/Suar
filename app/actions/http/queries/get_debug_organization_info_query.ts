import GetDebugOrganizationInfoQuery from '#actions/organizations/queries/get_debug_organization_info_query'
import type { DatabaseId } from '#types/database'

export default class GetHttpDebugOrganizationInfoQuery {
  async execute(userId: DatabaseId, sessionOrgId: string | undefined) {
    return GetDebugOrganizationInfoQuery.execute(userId, sessionOrgId)
  }
}
