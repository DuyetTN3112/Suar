import { AuthorizationSystemUserAdminAccessAdapter } from '#composition/adapters/authorization/authorization_system_user_admin_access_adapter'
import { UserRecruitingAccessReaderAdapter } from '#composition/adapters/users/user_recruiting_access_reader_adapter'
import { ComposedUserAccountActionFactory } from '#composition/users/lifecycle/factories/composed_user_account_action_factory'
import { ComposedUserAdministrationQueryFactory } from '#composition/users/administration/factories/composed_user_administration_query_factory'
import { ComposedUserProfileActionFactory } from '#composition/factories/composed_user_profile_action_factory'
import { ComposedUserRecruiterBookmarkActionFactory } from '#composition/users/bookmarks/factories/composed_user_recruiter_bookmark_action_factory'
import { userExternalDependencies } from '#composition/users/user-external-dependencies/user_external_dependencies_composition'
import {
  userAccountRepository,
  userApplicationEvents,
  userLifecycleEvents,
  userLifecycleEventStager,
  recruiterBookmarkRepository,
  userProfileRepository,
  userRuntime,
  userTalentRepository,
  userTransactionRunner,
} from '#composition/users/user-persistence/user_persistence_composition'
import {
  completedAssignmentFactReader,
  profileReviewFactReader,
  selfAssessmentAccuracyFactReader,
} from '#composition/users/user-profile/user_profile_aggregate_composition'
import type AddUserSkillCommand from '#modules/users/actions/commands/profile-skills/add_user_skill_command'
import ApproveUserCommand from '#modules/users/actions/commands/user-lifecycle/approve_user_command'
import DeactivateUserCommand from '#modules/users/actions/commands/user-lifecycle/deactivate_user_command'
import type PublishUserProfileSnapshotCommand from '#modules/users/actions/commands/profile/publish_user_profile_snapshot_command'
import RefreshUserProfileAggregatesCommand from '#modules/users/actions/commands/profile/refresh_user_profile_aggregates_command'
import type RemoveUserSkillCommand from '#modules/users/actions/commands/profile-skills/remove_user_skill_command'
import type UpdateUserSkillCommand from '#modules/users/actions/commands/profile-skills/update_user_skill_command'
import type { UserNotificationStager } from '#modules/users/actions/ports/outbound/user_notification_stager'
import type GetProfileEditPageQuery from '#modules/users/actions/queries/profile/get_profile_edit_page_query'
import GetSpiderChartDataQuery from '#modules/users/actions/queries/talent/get_spider_chart_data_query'
import GetUserProfileQuery from '#modules/users/actions/queries/profile/get_user_profile_query'
import GetUserSkillsQuery from '#modules/users/actions/queries/profile-skills/get_user_skills_query'
import type GetUsersListQuery from '#modules/users/actions/queries/administration/get_users_list_query'
import type { UserActionContext } from '#modules/users/actions/user_action_context'

export const userProfileActionFactory = new ComposedUserProfileActionFactory(
  userExternalDependencies.organizationMembership,
  userExternalDependencies.skill,
  userExternalDependencies.skillCatalog,
  userTransactionRunner,
  userAccountRepository,
  userProfileRepository,
  userApplicationEvents,
  userRuntime,
  (context) =>
    new RefreshUserProfileAggregatesCommand(
      context,
      userTransactionRunner,
      userAccountRepository,
      userProfileRepository,
      completedAssignmentFactReader,
      profileReviewFactReader,
      selfAssessmentAccuracyFactReader
    )
)
export const userAccountActionFactory = new ComposedUserAccountActionFactory(
  userTransactionRunner,
  userAccountRepository,
  userRuntime,
  userApplicationEvents,
  userLifecycleEventStager
)
export const userRecruiterBookmarkActionFactory = new ComposedUserRecruiterBookmarkActionFactory(
  userTransactionRunner,
  userAccountRepository,
  recruiterBookmarkRepository,
  userTalentRepository,
  new UserRecruitingAccessReaderAdapter()
)
export const systemUserAdminAccessAuthorizer = new AuthorizationSystemUserAdminAccessAdapter()
export const userAdministrationQueryFactory = new ComposedUserAdministrationQueryFactory(
  userExternalDependencies.organizationMembership,
  userAccountRepository,
  systemUserAdminAccessAuthorizer
)

export function makeGetUsersListQuery(execCtx: UserActionContext): GetUsersListQuery {
  return userAdministrationQueryFactory.makeUsersList(execCtx)
}

export function makeGetUserProfileQuery(execCtx: UserActionContext): GetUserProfileQuery {
  return new GetUserProfileQuery(
    execCtx,
    userExternalDependencies.organizationMembership,
    userExternalDependencies.skillCatalog,
    userAccountRepository,
    userProfileRepository
  )
}

export function makeGetUserSkillsQuery(execCtx: UserActionContext): GetUserSkillsQuery {
  return new GetUserSkillsQuery(execCtx, userExternalDependencies.skill, userProfileRepository)
}

export function makeGetSpiderChartDataQuery(execCtx: UserActionContext): GetSpiderChartDataQuery {
  return new GetSpiderChartDataQuery(execCtx, userExternalDependencies.skill)
}

export function makeGetProfileEditPageQuery(execCtx: UserActionContext): GetProfileEditPageQuery {
  return userProfileActionFactory.makeEditPage(execCtx)
}

export function makeAddUserSkillCommand(execCtx: UserActionContext): AddUserSkillCommand {
  return userProfileActionFactory.makeAddSkill(execCtx)
}

export function makeRemoveUserSkillCommand(execCtx: UserActionContext): RemoveUserSkillCommand {
  return userProfileActionFactory.makeRemoveSkill(execCtx)
}

export function makeUpdateUserSkillCommand(execCtx: UserActionContext): UpdateUserSkillCommand {
  return userProfileActionFactory.makeUpdateSkill(execCtx)
}

export function makePublishUserProfileSnapshotCommand(
  execCtx: UserActionContext
): PublishUserProfileSnapshotCommand {
  return userProfileActionFactory.makePublishSnapshot(execCtx)
}

export function makeApproveUserCommand(execCtx: UserActionContext): ApproveUserCommand {
  return new ApproveUserCommand(
    execCtx,
    userTransactionRunner,
    userExternalDependencies.organizationMembership,
    userExternalDependencies.permission,
    userLifecycleEvents
  )
}

export function makeDeactivateUserCommand(
  execCtx: UserActionContext,
  notificationStager: UserNotificationStager
): DeactivateUserCommand {
  return new DeactivateUserCommand(
    execCtx,
    userTransactionRunner,
    notificationStager,
    userExternalDependencies.permission,
    userAccountRepository,
    userRuntime,
    userLifecycleEventStager
  )
}
