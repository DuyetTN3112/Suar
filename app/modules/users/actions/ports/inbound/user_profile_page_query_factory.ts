import type { UserWorkHistoryReader } from '#modules/users/actions/ports/outbound/user_work_history_reader'
import type GetFeaturedReviewsQuery from '#modules/users/actions/queries/get_featured_reviews_query'
import type GetProfileShowPageQuery from '#modules/users/actions/queries/get_profile_show_page_query'
import type GetProfileViewPageQuery from '#modules/users/actions/queries/get_profile_view_page_query'
import type GetUserDetailQuery from '#modules/users/actions/queries/get_user_detail_query'
import type { UserActionContext } from '#modules/users/actions/user_action_context'

/** Inbound factory contract for context-bound profile page queries. */
export abstract class UserProfilePageQueryFactory {
  abstract makeFeaturedReviews(context: UserActionContext): GetFeaturedReviewsQuery
  abstract makeView(
    context: UserActionContext,
    workHistory?: UserWorkHistoryReader
  ): GetProfileViewPageQuery
  abstract makeShow(
    context: UserActionContext,
    workHistory?: UserWorkHistoryReader
  ): GetProfileShowPageQuery
  abstract makeDetail(context: UserActionContext): GetUserDetailQuery
}
