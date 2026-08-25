import type CreateRecruiterBookmarkCommand from '#modules/users/actions/commands/bookmarks/create_recruiter_bookmark_command'
import type DeleteRecruiterBookmarkByTalentCommand from '#modules/users/actions/commands/bookmarks/delete_recruiter_bookmark_by_talent_command'
import type DeleteRecruiterBookmarkCommand from '#modules/users/actions/commands/bookmarks/delete_recruiter_bookmark_command'
import type UpdateRecruiterBookmarkCommand from '#modules/users/actions/commands/bookmarks/update_recruiter_bookmark_command'
import type ListRecruiterBookmarksQuery from '#modules/users/actions/queries/bookmarks/list_recruiter_bookmarks_query'
import type ListRecruiterBookmarksWorkspaceQuery from '#modules/users/actions/queries/bookmarks/list_recruiter_bookmarks_workspace_query'
import type { UserActionContext } from '#modules/users/actions/user_action_context'

/** Inbound factory contract for context-bound recruiter bookmark use cases. */
export abstract class UserRecruiterBookmarkActionFactory {
  abstract makeList(context: UserActionContext): ListRecruiterBookmarksQuery
  abstract makeWorkspace(
    context: UserActionContext
  ): ListRecruiterBookmarksWorkspaceQuery
  abstract makeCreate(context: UserActionContext): CreateRecruiterBookmarkCommand
  abstract makeUpdate(context: UserActionContext): UpdateRecruiterBookmarkCommand
  abstract makeDelete(context: UserActionContext): DeleteRecruiterBookmarkCommand
  abstract makeDeleteByTalent(
    context: UserActionContext
  ): DeleteRecruiterBookmarkByTalentCommand
}
