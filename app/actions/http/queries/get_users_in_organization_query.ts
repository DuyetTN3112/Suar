import GetUsersInOrganizationQuery from '#actions/organizations/queries/get_users_in_organization_query'
import type { DatabaseId } from '#types/database'

export default class GetHttpUsersInOrganizationQuery {
  async execute(organizationId: DatabaseId, excludeUserId: DatabaseId) {
    return new GetUsersInOrganizationQuery().execute(organizationId, excludeUserId)
  }
}
