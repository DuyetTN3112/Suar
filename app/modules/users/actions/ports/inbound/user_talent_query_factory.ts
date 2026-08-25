import type { HttpActionContext } from '#modules/http/public_contracts/http_action_context'
import type GetRecruitingTalentDirectoryWorkspaceQuery from '#modules/users/actions/queries/recruiting/get_recruiting_talent_directory_workspace_query'
import type GetRecruitingTalentDiscoveryPageQuery from '#modules/users/actions/queries/recruiting/get_recruiting_talent_discovery_page_query'
import type GetRecruitingTalentProfileQuery from '#modules/users/actions/queries/recruiting/get_recruiting_talent_profile_query'
import type SearchRecruitingTalentsQuery from '#modules/users/actions/queries/search/search_recruiting_talents_query'
import type SearchTalentsQuery from '#modules/users/actions/queries/search/search_talents_query'
import type GetTalentDirectoryPageQuery from '#modules/users/actions/queries/talent/get_talent_directory_page_query'
import type { UserActionContext } from '#modules/users/actions/user_action_context'

/** Inbound factory contract for context-bound talent queries. */
export abstract class UserTalentQueryFactory {
  abstract makeSearch(context: UserActionContext): SearchTalentsQuery
  abstract makeRecruitingSearch(context: UserActionContext): Pick<SearchRecruitingTalentsQuery, 'handle' | 'executeAndWrap'>
  abstract makeDirectoryPage(context: UserActionContext): GetTalentDirectoryPageQuery
  abstract makeRecruitingDirectoryWorkspace(
    context: UserActionContext
  ): GetRecruitingTalentDirectoryWorkspaceQuery
  abstract makeRecruitingTalentProfile(context: UserActionContext): GetRecruitingTalentProfileQuery
  abstract makeRecruitingTalentDiscoveryPage(
    context: HttpActionContext
  ): GetRecruitingTalentDiscoveryPageQuery
}
