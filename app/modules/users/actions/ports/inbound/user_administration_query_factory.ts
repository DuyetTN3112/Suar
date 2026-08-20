import type GetAuthorizedUsersListQuery from '#modules/users/actions/queries/administration/get_authorized_users_list_query'
import type GetPendingApprovalUsersQuery from '#modules/users/actions/queries/administration/get_pending_approval_users_query'
import type GetUsersListQuery from '#modules/users/actions/queries/administration/get_users_list_query'
import type { UserActionContext } from '#modules/users/actions/user_action_context'

/** Inbound factory contract for context-bound administration queries. */
export abstract class UserAdministrationQueryFactory {
  abstract makeUsersList(context: UserActionContext): GetUsersListQuery
  abstract makeAuthorizedUsersList(
    context: UserActionContext
  ): GetAuthorizedUsersListQuery
  abstract makePendingApprovals(
    context: UserActionContext
  ): GetPendingApprovalUsersQuery
}
