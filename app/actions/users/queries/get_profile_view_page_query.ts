import type { ExecutionContext } from '#types/execution_context'
import type { DatabaseId } from '#types/database'
import GetUserProfileQuery, { GetUserProfileDTO } from './get_user_profile_query.js'
import GetSpiderChartDataQuery, { GetSpiderChartDataDTO } from './get_spider_chart_data_query.js'
import GetUserDeliveryMetricsQuery, {
  GetUserDeliveryMetricsDTO,
} from './get_user_delivery_metrics_query.js'
import GetFeaturedReviewsQuery, { GetFeaturedReviewsDTO } from './get_featured_reviews_query.js'

export interface GetProfileViewPageInput {
  userId: DatabaseId
  currentUserId: DatabaseId | null
}

export interface GetProfileViewPageResult {
  user: Awaited<ReturnType<GetUserProfileQuery['handle']>>['user']
  completeness: number
  spiderChartData: Awaited<ReturnType<GetSpiderChartDataQuery['handle']>>
  deliveryMetrics: Awaited<ReturnType<GetUserDeliveryMetricsQuery['handle']>>
  featuredReviews: Awaited<ReturnType<GetFeaturedReviewsQuery['handle']>>
  isOwnProfile: boolean
}

export default class GetProfileViewPageQuery {
  constructor(protected execCtx: ExecutionContext) {}

  async execute(input: GetProfileViewPageInput): Promise<GetProfileViewPageResult> {
    const [profile, spiderChartData, deliveryMetrics, featuredReviews] = await Promise.all([
      new GetUserProfileQuery(this.execCtx).handle(new GetUserProfileDTO(input.userId)),
      new GetSpiderChartDataQuery(this.execCtx).handle(new GetSpiderChartDataDTO(input.userId)),
      new GetUserDeliveryMetricsQuery(this.execCtx).handle(
        new GetUserDeliveryMetricsDTO(input.userId)
      ),
      new GetFeaturedReviewsQuery(this.execCtx).handle(new GetFeaturedReviewsDTO(input.userId, 2)),
    ])

    return {
      user: profile.user,
      completeness: profile.completeness,
      spiderChartData,
      deliveryMetrics,
      featuredReviews,
      isOwnProfile: input.currentUserId === input.userId,
    }
  }
}
