import { userExternalDependencies } from './user_external_dependencies_composition.js'
import {
  userAccountRepository,
  userProfileRepository,
  userTalentRepository,
  userTransactionRunner,
} from './user_persistence_composition.js'
import {
  completedAssignmentFactReader,
  profileReviewFactReader,
  selfAssessmentAccuracyFactReader,
} from './user_profile_aggregate_composition.js'

import {
  ComposedUserAdministrationDirectory,
  ComposedUserAdministrationLifecycle,
} from '#composition/adapters/composed_user_administration'
import { ComposedUserIdentityReader } from '#composition/adapters/composed_user_identity_reader'
import { ComposedUserPublicApi } from '#composition/adapters/composed_user_public_api'
import { ComposedUserSocialLoginIdentityPersistence } from '#composition/adapters/composed_user_social_login_identity_persistence'
import { userAccountActionFactory } from '#composition/user_action_factory'
import RefreshUserProfileAggregatesCommand from '#modules/users/actions/commands/refresh_user_profile_aggregates_command'
import type UpdateUserProfileCommand from '#modules/users/actions/commands/update_user_profile_command'
import GetUserSkillSourceInsightsQuery from '#modules/users/actions/queries/get_user_skill_source_insights_query'
import type { UserActionContext } from '#modules/users/actions/user_action_context'

export function makeRefreshUserProfileAggregatesCommand(
  context: UserActionContext
): RefreshUserProfileAggregatesCommand {
  return new RefreshUserProfileAggregatesCommand(
    context,
    userTransactionRunner,
    userAccountRepository,
    userProfileRepository,
    completedAssignmentFactReader,
    profileReviewFactReader,
    selfAssessmentAccuracyFactReader
  )
}

export function makeUpdateUserProfileCommand(context: UserActionContext): UpdateUserProfileCommand {
  return userAccountActionFactory.makeUpdateProfile(context)
}

export const userPublicApi = new ComposedUserPublicApi(
  userAccountRepository,
  userProfileRepository,
  userTalentRepository,
  userTransactionRunner,
  userExternalDependencies.skillCatalog,
  makeRefreshUserProfileAggregatesCommand,
  makeUpdateUserProfileCommand
)

export const userSkillSourceInsightsQuery = new GetUserSkillSourceInsightsQuery(
  userTalentRepository
)
export const userIdentityReader = new ComposedUserIdentityReader(userAccountRepository)
export const userSocialLoginIdentityPersistence = new ComposedUserSocialLoginIdentityPersistence(
  userAccountRepository
)
export const userAdministrationDirectory = new ComposedUserAdministrationDirectory(
  userAccountRepository
)
export const userAdministrationLifecycle = new ComposedUserAdministrationLifecycle(
  userAccountRepository
)
