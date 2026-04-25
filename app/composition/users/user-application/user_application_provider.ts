import type { ApplicationService } from '@adonisjs/core/types'

import { UserTalentDirectoryOptionsReaderAdapter } from '#composition/adapters/users/user_talent_directory_options_reader_adapter'
import {
  systemUserAdminAccessAuthorizer,
  userAccountActionFactory,
  userAdministrationQueryFactory,
  userProfileActionFactory,
  userRecruiterBookmarkActionFactory,
} from '#composition/users/user-factories/user_action_factory'
import { userInvitationPageQuery } from '#composition/users/user-invitation/user_invitation_composition'
import { userProfilePageQueryFactory, userTalentQueryFactory } from '#composition/users/user-reading/user_query_composition'
import { UserAccountActionFactory } from '#modules/users/actions/ports/inbound/user_account_action_factory'
import { UserAdministrationQueryFactory } from '#modules/users/actions/ports/inbound/user_administration_query_factory'
import { UserProfileActionFactory } from '#modules/users/actions/ports/inbound/user_profile_action_factory'
import { UserProfilePageQueryFactory } from '#modules/users/actions/ports/inbound/user_profile_page_query_factory'
import { UserRecruiterBookmarkActionFactory } from '#modules/users/actions/ports/inbound/user_recruiter_bookmark_action_factory'
import { UserTalentQueryFactory } from '#modules/users/actions/ports/inbound/user_talent_query_factory'
import { SystemUserAdminAccessAuthorizer } from '#modules/users/actions/ports/outbound/system_user_admin_access_authorizer'
import GetMyInvitationsPageQuery from '#modules/users/actions/queries/invitations/get_my_invitations_page_query'
import GetTalentDirectoryOptionsQuery from '#modules/users/actions/queries/talent/get_talent_directory_options_query'

const talentDirectoryOptionsQuery = new GetTalentDirectoryOptionsQuery(
  new UserTalentDirectoryOptionsReaderAdapter()
)

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
    this.app.container.singleton(GetTalentDirectoryOptionsQuery, () => talentDirectoryOptionsQuery)
  }
}
