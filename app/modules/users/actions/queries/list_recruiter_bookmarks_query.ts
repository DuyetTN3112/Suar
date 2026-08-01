import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { BaseQuery } from '#modules/users/actions/base_query'
import type {
  RecruiterBookmarkListItem,
  RecruiterBookmarkRepository,
} from '#modules/users/actions/ports/outbound/recruiter_bookmark_repository'
import type { UserActionContext } from '#modules/users/actions/user_action_context'

export default class ListRecruiterBookmarksQuery extends BaseQuery<
  Record<string, never>,
  RecruiterBookmarkListItem[]
> {
  constructor(
    context: UserActionContext,
    private readonly bookmarks: RecruiterBookmarkRepository
  ) {
    super(context)
  }

  handle(): Promise<RecruiterBookmarkListItem[]> {
    const userId = this.getCurrentUserId()
    if (!userId) {
      throw new UnauthorizedException('Bạn cần đăng nhập để xem talent đã lưu')
    }
    return this.bookmarks.listByRecruiter(userId)
  }
}
