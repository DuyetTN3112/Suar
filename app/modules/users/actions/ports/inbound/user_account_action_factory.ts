import type ChangeUserRoleCommand from '#modules/users/actions/commands/user-lifecycle/change_user_role_command'
import type DeleteUserCommand from '#modules/users/actions/commands/user-lifecycle/delete_user_command'
import type RegisterUserCommand from '#modules/users/actions/commands/user-lifecycle/register_user_command'
import type UpdateProfileDiscoverabilityCommand from '#modules/users/actions/commands/profile/update_profile_discoverability_command'
import type UpdateUserDetailsCommand from '#modules/users/actions/commands/profile/update_user_details_command'
import type UpdateUserProfileCommand from '#modules/users/actions/commands/profile/update_user_profile_command'
import type { UserActionContext } from '#modules/users/actions/user_action_context'

/**
 * Inbound factory contract for context-bound account use cases.
 *
 * Concrete dependency assembly belongs to outer composition.
 */
export abstract class UserAccountActionFactory {
  abstract makeRegister(context: UserActionContext): RegisterUserCommand
  abstract makeUpdateProfile(context: UserActionContext): UpdateUserProfileCommand
  abstract makeUpdateDetails(context: UserActionContext): UpdateUserDetailsCommand
  abstract makeUpdateDiscoverability(
    context: UserActionContext
  ): UpdateProfileDiscoverabilityCommand
  abstract makeChangeRole(context: UserActionContext): ChangeUserRoleCommand
  abstract makeDelete(context: UserActionContext): DeleteUserCommand
}
