import type { AdminActionContext } from '#modules/admin/users/actions/action_context'
import type SuspendUserCommand from '#modules/admin/users/actions/commands/users/suspend_user_command'
import type UpdateUserSystemRoleCommand from '#modules/admin/users/actions/commands/users/update_user_system_role_command'
import type GetUserDetailsQuery from '#modules/admin/users/actions/queries/users/get_user_details_query'
import type ListUsersQuery from '#modules/admin/users/actions/queries/users/list_users_query'

export abstract class AdminUserActionFactory {
  abstract makeListUsersQuery(execCtx: AdminActionContext): ListUsersQuery

  abstract makeGetUserDetailsQuery(execCtx: AdminActionContext): GetUserDetailsQuery

  abstract makeSuspendUserCommand(execCtx: AdminActionContext): SuspendUserCommand

  abstract makeUpdateUserSystemRoleCommand(
    execCtx: AdminActionContext
  ): UpdateUserSystemRoleCommand
}
