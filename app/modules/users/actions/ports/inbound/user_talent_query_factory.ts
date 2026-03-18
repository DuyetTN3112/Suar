import type GetTalentDirectoryPageQuery from '#modules/users/actions/queries/get_talent_directory_page_query'
import type SearchTalentsQuery from '#modules/users/actions/queries/search_talents_query'
import type { UserActionContext } from '#modules/users/actions/user_action_context'

/** Inbound factory contract for context-bound talent queries. */
export abstract class UserTalentQueryFactory {
  abstract makeSearch(context: UserActionContext): SearchTalentsQuery
  abstract makeDirectoryPage(context: UserActionContext): GetTalentDirectoryPageQuery
}
