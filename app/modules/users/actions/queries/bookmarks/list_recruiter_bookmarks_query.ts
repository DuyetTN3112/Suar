import { BaseQuery } from '#modules/users/actions/base_query'
import type {
  RecruiterBookmarkListItem,
  RecruiterBookmarkRepository,
} from '#modules/users/actions/ports/outbound/recruiter_bookmark_repository'
import type { UserRecruitingAccessReader } from '#modules/users/actions/ports/outbound/user_recruiting_access_reader'
import { assertRecruitingDirectoryAccess } from '#modules/users/actions/policies/recruiting_directory_access_policy'
import type { UserActionContext } from '#modules/users/actions/user_action_context'

export default class ListRecruiterBookmarksQuery extends BaseQuery<
  Record<string, never>,
  RecruiterBookmarkListItem[]
> {
  constructor(
    context: UserActionContext,
    private readonly bookmarks: RecruiterBookmarkRepository,
    private readonly access: UserRecruitingAccessReader
  ) {
    super(context)
  }

  async handle(): Promise<RecruiterBookmarkListItem[]> {
    const actor = await assertRecruitingDirectoryAccess(this.execCtx, this.access)
    return this.bookmarks.listByRecruiter(actor.userId)
  }
}
