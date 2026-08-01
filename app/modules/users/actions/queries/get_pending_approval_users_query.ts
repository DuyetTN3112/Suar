import type { UserOrganizationMembershipReaderWriter } from '../ports/outbound/user_external_dependencies.js'

import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import type { SystemUserAdminAccessAuthorizer } from '#modules/users/actions/ports/outbound/system_user_admin_access_authorizer'
import type { UserActionContext } from '#modules/users/actions/user_action_context'

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
  constructor(
    private readonly context: UserActionContext,
    private readonly organizationMembership: UserOrganizationMembershipReaderWriter,
    private readonly adminAccess: SystemUserAdminAccessAuthorizer
  ) {}

  async getList(): Promise<PendingUser[]> {
    const organizationId = await this.requireAdminAccess()
    return this.organizationMembership.listPendingApprovalUsers(organizationId)
  }

  async getCount(): Promise<number> {
    const organizationId = await this.requireAdminAccess()
    return this.organizationMembership.countPendingApprovalUsers(organizationId)
  }

  private async requireAdminAccess(): Promise<string> {
    const { userId, organizationId } = this.context
    if (!userId) {
      throw new UnauthorizedException()
    }
    if (!organizationId) {
      throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
    }

    await this.adminAccess.authorize(userId, organizationId)
    return organizationId
  }

}
