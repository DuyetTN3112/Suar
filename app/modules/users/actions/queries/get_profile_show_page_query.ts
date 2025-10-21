import GetCurrentProfileSnapshotQuery, {
  GetCurrentProfileSnapshotDTO,
} from './get_current_profile_snapshot_query.js'
import GetFeaturedReviewsQuery, { GetFeaturedReviewsDTO } from './get_featured_reviews_query.js'
import GetSpiderChartDataQuery, { GetSpiderChartDataDTO } from './get_spider_chart_data_query.js'
import GetUserDeliveryMetricsQuery, {
  GetUserDeliveryMetricsDTO,
} from './get_user_delivery_metrics_query.js'
import GetUserProfileQuery, { GetUserProfileDTO } from './get_user_profile_query.js'
import GetUserSkillsQuery, { GetUserSkillsDTO } from './get_user_skills_query.js'
import GetUserWorkHistoryQuery, {
  GetUserWorkHistoryDTO,
} from './get_user_work_history_query.js'

import ListUserReviewHistoryQuery from '#modules/reviews/actions/queries/list_user_review_history_query'
import { reviewPublicApi } from '#modules/reviews/public_contracts/review_public_api'
import type { UserActionContext } from '#modules/users/actions/user_action_context'

export interface GetProfileShowPageInput {
  userId: string
}

export interface GetProfileShowPageResult {
  user: Awaited<ReturnType<GetUserProfileQuery['handle']>>['user']
  userSkills: Awaited<ReturnType<GetUserSkillsQuery['handle']>>
  completeness: number
  spiderChartData: Awaited<ReturnType<GetSpiderChartDataQuery['handle']>>
  deliveryMetrics: Awaited<ReturnType<GetUserDeliveryMetricsQuery['handle']>>
  featuredReviews: Awaited<ReturnType<GetFeaturedReviewsQuery['handle']>>
  reviewHistory: Awaited<ReturnType<ListUserReviewHistoryQuery['handle']>>
  workHistory: Awaited<ReturnType<GetUserWorkHistoryQuery['handle']>>
  currentSnapshot: Awaited<ReturnType<GetCurrentProfileSnapshotQuery['handle']>>['snapshot']
}

export default class GetProfileShowPageQuery {
  constructor(protected execCtx: UserActionContext) {}

  async execute(input: GetProfileShowPageInput): Promise<GetProfileShowPageResult> {
    const [
      profile,
      userSkills,
      spiderChartData,
      deliveryMetrics,
      featuredReviews,
      reviewHistory,
      workHistory,
      currentSnapshot,
      reverseReviewSummary,
    ] =
      await Promise.all([
        new GetUserProfileQuery(this.execCtx).handle(new GetUserProfileDTO(input.userId)),
        new GetUserSkillsQuery(this.execCtx).handle(new GetUserSkillsDTO(input.userId)),
        new GetSpiderChartDataQuery(this.execCtx).handle(new GetSpiderChartDataDTO(input.userId)),
        new GetUserDeliveryMetricsQuery(this.execCtx).handle(
          new GetUserDeliveryMetricsDTO(input.userId)
        ),
        new GetFeaturedReviewsQuery(this.execCtx).handle(
          new GetFeaturedReviewsDTO(input.userId, 8)
        ),
        new ListUserReviewHistoryQuery(this.execCtx).handle(),
        new GetUserWorkHistoryQuery(this.execCtx).handle(
          new GetUserWorkHistoryDTO(input.userId)
        ),
        new GetCurrentProfileSnapshotQuery(this.execCtx).handle(
          new GetCurrentProfileSnapshotDTO(input.userId)
        ),
        reviewPublicApi.loadUserReverseReviewSummary(input.userId),
      ])

    return {
      user: {
        ...profile.user,
        reverse_review_summary: reverseReviewSummary,
      },
      userSkills,
      completeness: profile.completeness,
      spiderChartData,
      deliveryMetrics,
      featuredReviews,
      reviewHistory,
      workHistory,
      currentSnapshot: currentSnapshot.snapshot,
    }
  }
}
