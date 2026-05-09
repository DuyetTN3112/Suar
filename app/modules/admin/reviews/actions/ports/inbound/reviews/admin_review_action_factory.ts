import type { AdminActionContext } from '#modules/admin/reviews/actions/action_context'
import type ResolveFlaggedReviewCommand from '#modules/admin/reviews/actions/commands/reviews/resolve_flagged_review_command'
import type GetFlaggedReviewDetailQuery from '#modules/admin/reviews/actions/queries/reviews/get_flagged_review_detail_query'
import type ListFlaggedReviewsQuery from '#modules/admin/reviews/actions/queries/reviews/list_flagged_reviews_query'

export abstract class AdminReviewActionFactory {
  abstract makeListFlaggedReviewsQuery(
    execCtx: AdminActionContext
  ): ListFlaggedReviewsQuery

  abstract makeGetFlaggedReviewDetailQuery(
    execCtx: AdminActionContext
  ): GetFlaggedReviewDetailQuery

  abstract makeResolveFlaggedReviewCommand(
    execCtx: AdminActionContext
  ): ResolveFlaggedReviewCommand
}
