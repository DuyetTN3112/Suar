import ChangeUserRoleCommand from '#modules/users/actions/commands/change_user_role_command'
import DeleteUserCommand from '#modules/users/actions/commands/delete_user_command'
import RegisterUserCommand from '#modules/users/actions/commands/register_user_command'
import UpdateProfileDiscoverabilityCommand from '#modules/users/actions/commands/update_profile_discoverability_command'
import UpdateUserDetailsCommand from '#modules/users/actions/commands/update_user_details_command'
import UpdateUserProfileCommand from '#modules/users/actions/commands/update_user_profile_command'
import { UserAccountActionFactory } from '#modules/users/actions/ports/inbound/user_account_action_factory'
import type { UserAccountRepository } from '#modules/users/actions/ports/outbound/user_account_repository'
import type { UserApplicationEventPublisher } from '#modules/users/actions/ports/outbound/user_application_event_publisher'
import type { UserLifecycleEventStager } from '#modules/users/actions/ports/outbound/user_lifecycle_event_stager'
import type { UserRuntime } from '#modules/users/actions/ports/outbound/user_runtime'
import type { UserTransactionRunner } from '#modules/users/actions/ports/outbound/user_transaction'
import type { UserActionContext } from '#modules/users/actions/user_action_context'

/**
 * Creates context-bound account commands.
 *
 * The commands remain the use-case orchestrators; this factory only owns their
 * dependency assembly.
 */
export class ComposedUserAccountActionFactory extends UserAccountActionFactory {
  constructor(
    private readonly transactions: UserTransactionRunner,
    private readonly users: UserAccountRepository,
    private readonly runtime: UserRuntime,
    private readonly events: UserApplicationEventPublisher,
    private readonly lifecycleEvents: UserLifecycleEventStager
  ) {
    super()
  }

  makeRegister(context: UserActionContext): RegisterUserCommand {
    return new RegisterUserCommand(
      context,
      this.transactions,
      this.users,
      this.runtime,
      this.lifecycleEvents
    )
  }

  makeUpdateProfile(context: UserActionContext): UpdateUserProfileCommand {
    return new UpdateUserProfileCommand(
      context,
      this.transactions,
      this.users,
      this.runtime,
      this.lifecycleEvents
    )
  }

  makeUpdateDetails(context: UserActionContext): UpdateUserDetailsCommand {
    return new UpdateUserDetailsCommand(
      context,
      this.transactions,
      this.users,
      this.runtime,
      this.lifecycleEvents
    )
  }

  makeUpdateDiscoverability(
    context: UserActionContext
  ): UpdateProfileDiscoverabilityCommand {
    return new UpdateProfileDiscoverabilityCommand(
      context,
      this.transactions,
      this.users,
      this.runtime,
      this.lifecycleEvents
    )
  }

  makeChangeRole(context: UserActionContext): ChangeUserRoleCommand {
    return new ChangeUserRoleCommand(context, this.transactions, this.users, this.events)
  }

  makeDelete(context: UserActionContext): DeleteUserCommand {
    return new DeleteUserCommand(
      context,
      this.transactions,
      this.users,
      this.runtime,
      this.lifecycleEvents
    )
  }
}
