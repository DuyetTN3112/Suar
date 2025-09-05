import { DefaultUserDependencies } from '../ports/user_external_dependencies_impl.js'



interface PendingUser {
  id: string
  email: string
  username: string
  system_role: string
  status: string
  avatar_url: string | null
  created_at: string
}

/**
 * Query: Get Pending Approval Users
 *
 * Returns users who are pending approval in the current organization.
 * Also provides a count-only method for badge display.
 */
export default class GetPendingApprovalUsersQuery {
  /**
   * Get list of pending approval users in the organization.
   */
  async getList(organizationId: string): Promise<PendingUser[]> {
    return DefaultUserDependencies.organizationMembership.listPendingApprovalUsers(organizationId)
  }

  /**
   * Get count of pending approval users in the organization.
   */
  async getCount(organizationId: string): Promise<number> {
    return DefaultUserDependencies.organizationMembership.countPendingApprovalUsers(organizationId)
  }
}
