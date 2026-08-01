import CreateRecruiterBookmarkCommand from '#modules/users/actions/commands/create_recruiter_bookmark_command'
import DeleteRecruiterBookmarkByTalentCommand from '#modules/users/actions/commands/delete_recruiter_bookmark_by_talent_command'
import DeleteRecruiterBookmarkCommand from '#modules/users/actions/commands/delete_recruiter_bookmark_command'
import UpdateRecruiterBookmarkCommand from '#modules/users/actions/commands/update_recruiter_bookmark_command'
import { UserRecruiterBookmarkActionFactory } from '#modules/users/actions/ports/inbound/user_recruiter_bookmark_action_factory'
import type { RecruiterBookmarkRepository } from '#modules/users/actions/ports/outbound/recruiter_bookmark_repository'
import type { UserAccountRepository } from '#modules/users/actions/ports/outbound/user_account_repository'
import type { UserTalentRepository } from '#modules/users/actions/ports/outbound/user_talent_repository'
import type { UserTransactionRunner } from '#modules/users/actions/ports/outbound/user_transaction'
import ListRecruiterBookmarksQuery from '#modules/users/actions/queries/list_recruiter_bookmarks_query'
import ListRecruiterBookmarksWorkspaceQuery from '#modules/users/actions/queries/list_recruiter_bookmarks_workspace_query'
import type { UserActionContext } from '#modules/users/actions/user_action_context'

/**
 * Creates recruiter-bookmark Commands and Queries from shared outbound ports.
 */
export class ComposedUserRecruiterBookmarkActionFactory extends UserRecruiterBookmarkActionFactory {
  constructor(
    private readonly transactions: UserTransactionRunner,
    private readonly users: UserAccountRepository,
    private readonly bookmarks: RecruiterBookmarkRepository,
    private readonly talents: UserTalentRepository
  ) {
    super()
  }

  makeList(context: UserActionContext): ListRecruiterBookmarksQuery {
    return new ListRecruiterBookmarksQuery(context, this.bookmarks)
  }

  makeWorkspace(context: UserActionContext): ListRecruiterBookmarksWorkspaceQuery {
    return new ListRecruiterBookmarksWorkspaceQuery(
      context,
      this.bookmarks,
      this.talents
    )
  }

  makeCreate(context: UserActionContext): CreateRecruiterBookmarkCommand {
    return new CreateRecruiterBookmarkCommand(
      context,
      this.transactions,
      this.users,
      this.bookmarks
    )
  }

  makeUpdate(context: UserActionContext): UpdateRecruiterBookmarkCommand {
    return new UpdateRecruiterBookmarkCommand(
      context,
      this.transactions,
      this.bookmarks
    )
  }

  makeDelete(context: UserActionContext): DeleteRecruiterBookmarkCommand {
    return new DeleteRecruiterBookmarkCommand(
      context,
      this.transactions,
      this.bookmarks
    )
  }

  makeDeleteByTalent(
    context: UserActionContext
  ): DeleteRecruiterBookmarkByTalentCommand {
    return new DeleteRecruiterBookmarkByTalentCommand(
      context,
      this.transactions,
      this.bookmarks
    )
  }
}
