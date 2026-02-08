import GetCurrentProfileSnapshotQuery, {
  GetCurrentProfileSnapshotDTO,
} from './get_current_profile_snapshot_query.js'
import GetFeaturedReviewsQuery, { GetFeaturedReviewsDTO } from './get_featured_reviews_query.js'
import GetSpiderChartDataQuery, { GetSpiderChartDataDTO } from './get_spider_chart_data_query.js'
import GetUserDeliveryMetricsQuery, {
  GetUserDeliveryMetricsDTO,
} from './get_user_delivery_metrics_query.js'
import GetUserProfileQuery, { GetUserProfileDTO } from './get_user_profile_query.js'

import type { DatabaseId } from '#types/database'
import type { ExecutionContext } from '#types/execution_context'

export interface GetProfileShowPageInput {
  userId: DatabaseId
}

export interface GetProfileShowPageResult {
  user: Awaited<ReturnType<GetUserProfileQuery['handle']>>['user']
  completeness: number
  spiderChartData: Awaited<ReturnType<GetSpiderChartDataQuery['handle']>>
  deliveryMetrics: Awaited<ReturnType<GetUserDeliveryMetricsQuery['handle']>>
  featuredReviews: Awaited<ReturnType<GetFeaturedReviewsQuery['handle']>>
  currentSnapshot: Awaited<ReturnType<GetCurrentProfileSnapshotQuery['handle']>>['snapshot']
}

export default class GetProfileShowPageQuery {
  constructor(protected execCtx: ExecutionContext) {}

  async execute(input: GetProfileShowPageInput): Promise<GetProfileShowPageResult> {
    const [profile, spiderChartData, deliveryMetrics, featuredReviews, currentSnapshot] =
      await Promise.all([
        new GetUserProfileQuery(this.execCtx).handle(new GetUserProfileDTO(input.userId)),
        new GetSpiderChartDataQuery(this.execCtx).handle(new GetSpiderChartDataDTO(input.userId)),
        new GetUserDeliveryMetricsQuery(this.execCtx).handle(
          new GetUserDeliveryMetricsDTO(input.userId)
        ),
        new GetFeaturedReviewsQuery(this.execCtx).handle(
          new GetFeaturedReviewsDTO(input.userId, 2)
        ),
        new GetCurrentProfileSnapshotQuery(this.execCtx).handle(
          new GetCurrentProfileSnapshotDTO(input.userId)
        ),
      ])

    return {
      user: profile.user,
      completeness: profile.completeness,
      spiderChartData,
      deliveryMetrics,
      featuredReviews,
      currentSnapshot: currentSnapshot.snapshot,
    }
  }
}
