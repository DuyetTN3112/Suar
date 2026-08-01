import { UserAdministrationQueryFactory } from '#modules/users/actions/ports/inbound/user_administration_query_factory'
import type { SystemUserAdminAccessAuthorizer } from '#modules/users/actions/ports/outbound/system_user_admin_access_authorizer'
import type { UserAccountRepository } from '#modules/users/actions/ports/outbound/user_account_repository'
import type { UserOrganizationMembershipReaderWriter } from '#modules/users/actions/ports/outbound/user_external_dependencies'
import GetAuthorizedUsersListQuery from '#modules/users/actions/queries/get_authorized_users_list_query'
import GetPendingApprovalUsersQuery from '#modules/users/actions/queries/get_pending_approval_users_query'
import GetUsersListQuery from '#modules/users/actions/queries/get_users_list_query'
import type { UserActionContext } from '#modules/users/actions/user_action_context'

/**
 * Creates the context-bound Users administration list query.
 */
export class ComposedUserAdministrationQueryFactory extends UserAdministrationQueryFactory {
  constructor(
    private readonly organizationMembership: UserOrganizationMembershipReaderWriter,
    private readonly users: UserAccountRepository,
    private readonly adminAccess: SystemUserAdminAccessAuthorizer
  ) {
    super()
  }

  makeUsersList(context: UserActionContext): GetUsersListQuery {
    return new GetUsersListQuery(context, this.organizationMembership, this.users)
  }

  makeAuthorizedUsersList(context: UserActionContext): GetAuthorizedUsersListQuery {
    return new GetAuthorizedUsersListQuery(
      context,
      this.makeUsersList(context),
      this.adminAccess
    )
  }

  makePendingApprovals(context: UserActionContext): GetPendingApprovalUsersQuery {
    return new GetPendingApprovalUsersQuery(
      context,
      this.organizationMembership,
      this.adminAccess
    )
  }
}
