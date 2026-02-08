import type { ApplicationService } from '@adonisjs/core/types'

import {
  systemUserAdminAccessAuthorizer,
  userAccountActionFactory,
  userAdministrationQueryFactory,
  userProfileActionFactory,
  userRecruiterBookmarkActionFactory,
} from './user_action_factory.js'
import { userInvitationPageQuery } from './user_invitation_composition.js'
import { userProfilePageQueryFactory, userTalentQueryFactory } from './user_query_composition.js'
import {
  recruitingDirectoryAccessQuery,
  talentDirectoryOptionsQuery,
} from './user_recruiting_directory_composition.js'

import { UserAccountActionFactory } from '#modules/users/actions/ports/inbound/user_account_action_factory'
import { UserAdministrationQueryFactory } from '#modules/users/actions/ports/inbound/user_administration_query_factory'
import { UserProfileActionFactory } from '#modules/users/actions/ports/inbound/user_profile_action_factory'
import { UserProfilePageQueryFactory } from '#modules/users/actions/ports/inbound/user_profile_page_query_factory'
import { UserRecruiterBookmarkActionFactory } from '#modules/users/actions/ports/inbound/user_recruiter_bookmark_action_factory'
import { UserTalentQueryFactory } from '#modules/users/actions/ports/inbound/user_talent_query_factory'
import { SystemUserAdminAccessAuthorizer } from '#modules/users/actions/ports/outbound/system_user_admin_access_authorizer'
import GetMyInvitationsPageQuery from '#modules/users/actions/queries/get_my_invitations_page_query'
import GetTalentDirectoryOptionsQuery from '#modules/users/actions/queries/get_talent_directory_options_query'
import RecruitingDirectoryAccessQuery from '#modules/users/actions/queries/recruiting_directory_access_query'

/**
 * Registers Users-owned inbound application use cases.
 *
 * Concrete outbound adapters remain in outer composition; controllers resolve
 * only the narrow command/query they invoke.
 */
export default class UserApplicationProvider {
  constructor(private readonly app: ApplicationService) {}

  register(): void {
    this.app.container.singleton(GetMyInvitationsPageQuery, () => userInvitationPageQuery)
    this.app.container.singleton(
      RecruitingDirectoryAccessQuery,
      () => recruitingDirectoryAccessQuery
    )
    this.app.container.singleton(GetTalentDirectoryOptionsQuery, () => talentDirectoryOptionsQuery)
    this.app.container.singleton(UserProfileActionFactory, () => userProfileActionFactory)
    this.app.container.singleton(UserAccountActionFactory, () => userAccountActionFactory)
    this.app.container.singleton(
      UserRecruiterBookmarkActionFactory,
      () => userRecruiterBookmarkActionFactory
    )
    this.app.container.singleton(
      UserAdministrationQueryFactory,
      () => userAdministrationQueryFactory
    )
    this.app.container.singleton(
      SystemUserAdminAccessAuthorizer,
      () => systemUserAdminAccessAuthorizer
    )
    this.app.container.singleton(UserProfilePageQueryFactory, () => userProfilePageQueryFactory)
    this.app.container.singleton(UserTalentQueryFactory, () => userTalentQueryFactory)
  }
}
