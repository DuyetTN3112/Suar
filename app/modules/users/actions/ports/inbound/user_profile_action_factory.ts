import type AddUserSkillCommand from '#modules/users/actions/commands/add_user_skill_command'
import type PublishUserProfileSnapshotCommand from '#modules/users/actions/commands/publish_user_profile_snapshot_command'
import type RemoveUserSkillCommand from '#modules/users/actions/commands/remove_user_skill_command'
import type RotateProfileSnapshotShareLinkCommand from '#modules/users/actions/commands/rotate_profile_snapshot_share_link_command'
import type UpdateProfileSnapshotAccessCommand from '#modules/users/actions/commands/update_profile_snapshot_access_command'
import type UpdateUserSkillCommand from '#modules/users/actions/commands/update_user_skill_command'
import type GetCurrentProfileSnapshotQuery from '#modules/users/actions/queries/get_current_profile_snapshot_query'
import type GetProfileEditPageQuery from '#modules/users/actions/queries/get_profile_edit_page_query'
import type GetProfileSnapshotHistoryQuery from '#modules/users/actions/queries/get_profile_snapshot_history_query'
import type GetPublicProfileSnapshotQuery from '#modules/users/actions/queries/get_public_profile_snapshot_query'
import type { UserActionContext } from '#modules/users/actions/user_action_context'

/** Inbound factory contract for context-bound profile use cases. */
export abstract class UserProfileActionFactory {
  abstract makeEditPage(context: UserActionContext): GetProfileEditPageQuery
  abstract makeAddSkill(context: UserActionContext): AddUserSkillCommand
  abstract makeRemoveSkill(context: UserActionContext): RemoveUserSkillCommand
  abstract makeUpdateSkill(context: UserActionContext): UpdateUserSkillCommand
  abstract makePublishSnapshot(
    context: UserActionContext
  ): PublishUserProfileSnapshotCommand
  abstract makeCurrentSnapshot(context: UserActionContext): GetCurrentProfileSnapshotQuery
  abstract makeSnapshotHistory(
    context: UserActionContext
  ): GetProfileSnapshotHistoryQuery
  abstract makePublicSnapshot(context: UserActionContext): GetPublicProfileSnapshotQuery
  abstract makeRotateSnapshotShareLink(
    context: UserActionContext
  ): RotateProfileSnapshotShareLinkCommand
  abstract makeUpdateSnapshotAccess(
    context: UserActionContext
  ): UpdateProfileSnapshotAccessCommand
}
