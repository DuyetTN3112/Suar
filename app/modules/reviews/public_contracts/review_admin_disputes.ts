import GetAdminReviewDisputeDetailQuery, {
  type GetAdminReviewDisputeDetailDTO,
  type GetAdminReviewDisputeDetailResult,
} from '#modules/reviews/actions/queries/get_admin_review_dispute_detail_query'
import ListAdminReviewDisputesQuery, {
  type ListAdminReviewDisputesDTO,
  type ListAdminReviewDisputesResult,
} from '#modules/reviews/actions/queries/list_admin_review_disputes_query'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'

export type {
  GetAdminReviewDisputeDetailDTO,
  GetAdminReviewDisputeDetailResult,
  ListAdminReviewDisputesDTO,
  ListAdminReviewDisputesResult,
}

export async function getAdminReviewDisputeDetail(
  input: GetAdminReviewDisputeDetailDTO,
  execCtx: ReviewActionContext
): Promise<GetAdminReviewDisputeDetailResult> {
  return new GetAdminReviewDisputeDetailQuery(execCtx).execute(input)
}

export async function listAdminReviewDisputes(
  input: ListAdminReviewDisputesDTO,
  execCtx: ReviewActionContext
): Promise<ListAdminReviewDisputesResult> {
  return new ListAdminReviewDisputesQuery(execCtx).execute(input)
}
