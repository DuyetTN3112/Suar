import AddUserSkillCommand from '#modules/users/actions/commands/add_user_skill_command'
import PublishUserProfileSnapshotCommand from '#modules/users/actions/commands/publish_user_profile_snapshot_command'
import type RefreshUserProfileAggregatesCommand from '#modules/users/actions/commands/refresh_user_profile_aggregates_command'
import RemoveUserSkillCommand from '#modules/users/actions/commands/remove_user_skill_command'
import RotateProfileSnapshotShareLinkCommand from '#modules/users/actions/commands/rotate_profile_snapshot_share_link_command'
import UpdateProfileSnapshotAccessCommand from '#modules/users/actions/commands/update_profile_snapshot_access_command'
import UpdateUserSkillCommand from '#modules/users/actions/commands/update_user_skill_command'
import { UserProfileActionFactory } from '#modules/users/actions/ports/inbound/user_profile_action_factory'
import type { UserAccountRepository } from '#modules/users/actions/ports/outbound/user_account_repository'
import type { UserApplicationEventPublisher } from '#modules/users/actions/ports/outbound/user_application_event_publisher'
import type {
  UserOrganizationMembershipReaderWriter,
  UserSkillReader,
} from '#modules/users/actions/ports/outbound/user_external_dependencies'
import type { UserProfileRepository } from '#modules/users/actions/ports/outbound/user_profile_repository'
import type { UserRuntime } from '#modules/users/actions/ports/outbound/user_runtime'
import type { UserSkillCatalog } from '#modules/users/actions/ports/outbound/user_skill_catalog'
import type { UserTransactionRunner } from '#modules/users/actions/ports/outbound/user_transaction'
import GetCurrentProfileSnapshotQuery from '#modules/users/actions/queries/get_current_profile_snapshot_query'
import GetProfileEditPageQuery from '#modules/users/actions/queries/get_profile_edit_page_query'
import GetProfileSnapshotHistoryQuery from '#modules/users/actions/queries/get_profile_snapshot_history_query'
import GetPublicProfileSnapshotQuery from '#modules/users/actions/queries/get_public_profile_snapshot_query'
import type { UserActionContext } from '#modules/users/actions/user_action_context'

/**
 * Creates context-bound profile commands and the profile-edit page query.
 *
 * Profile policy and transaction orchestration remain in the individual use cases.
 */
export class ComposedUserProfileActionFactory extends UserProfileActionFactory {
  constructor(
    private readonly organizationMembership: UserOrganizationMembershipReaderWriter,
    private readonly skills: UserSkillReader,
    private readonly skillCatalog: UserSkillCatalog,
    private readonly transactions: UserTransactionRunner,
    private readonly users: UserAccountRepository,
    private readonly profiles: UserProfileRepository,
    private readonly events: UserApplicationEventPublisher,
    private readonly runtime: UserRuntime,
    private readonly makeRefreshAggregates: (
      context: UserActionContext
    ) => RefreshUserProfileAggregatesCommand
  ) {
    super()
  }

  makeEditPage(context: UserActionContext): GetProfileEditPageQuery {
    return new GetProfileEditPageQuery(
      context,
      this.organizationMembership,
      this.skills,
      this.skillCatalog,
      this.users,
      this.profiles
    )
  }

  makeAddSkill(context: UserActionContext): AddUserSkillCommand {
    return new AddUserSkillCommand(
      context,
      this.transactions,
      this.profiles,
      this.skills,
      this.skillCatalog,
      this.events
    )
  }

  makeRemoveSkill(context: UserActionContext): RemoveUserSkillCommand {
    return new RemoveUserSkillCommand(
      context,
      this.transactions,
      this.profiles,
      this.skillCatalog,
      this.events
    )
  }

  makeUpdateSkill(context: UserActionContext): UpdateUserSkillCommand {
    return new UpdateUserSkillCommand(
      context,
      this.transactions,
      this.profiles,
      this.skills,
      this.events
    )
  }

  makePublishSnapshot(context: UserActionContext): PublishUserProfileSnapshotCommand {
    return new PublishUserProfileSnapshotCommand(
      context,
      this.transactions,
      this.users,
      this.profiles,
      this.runtime,
      this.makeRefreshAggregates(context),
      this.skillCatalog
    )
  }

  makeCurrentSnapshot(context: UserActionContext): GetCurrentProfileSnapshotQuery {
    return new GetCurrentProfileSnapshotQuery(context, this.profiles)
  }

  makeSnapshotHistory(context: UserActionContext): GetProfileSnapshotHistoryQuery {
    return new GetProfileSnapshotHistoryQuery(context, this.profiles)
  }

  makePublicSnapshot(context: UserActionContext): GetPublicProfileSnapshotQuery {
    return new GetPublicProfileSnapshotQuery(context, this.profiles)
  }

  makeRotateSnapshotShareLink(
    context: UserActionContext
  ): RotateProfileSnapshotShareLinkCommand {
    return new RotateProfileSnapshotShareLinkCommand(
      context,
      this.transactions,
      this.users,
      this.profiles,
      this.runtime
    )
  }

  makeUpdateSnapshotAccess(
    context: UserActionContext
  ): UpdateProfileSnapshotAccessCommand {
    return new UpdateProfileSnapshotAccessCommand(
      context,
      this.transactions,
      this.users,
      this.profiles,
      this.runtime
    )
  }
}
