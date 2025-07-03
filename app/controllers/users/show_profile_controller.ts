import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import GetUserProfileQuery from '#actions/users/queries/get_user_profile_query'
import GetSpiderChartDataQuery from '#actions/users/queries/get_spider_chart_data_query'
import GetUserDeliveryMetricsQuery from '#actions/users/queries/get_user_delivery_metrics_query'
import GetFeaturedReviewsQuery from '#actions/users/queries/get_featured_reviews_query'
import GetCurrentProfileSnapshotQuery from '#actions/users/queries/get_current_profile_snapshot_query'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import {
  buildGetCurrentProfileSnapshotDTO,
  buildGetFeaturedReviewsDTO,
  buildGetSpiderChartDataDTO,
  buildGetUserDeliveryMetricsDTO,
  buildGetUserProfileDTO,
} from './mapper/request/user_request_mapper.js'
import { mapProfileShowPageProps } from './mapper/response/user_response_mapper.js'

/**
 * GET /profile → Display user's own profile
 */
export default class ShowProfileController {
  async handle(ctx: HttpContext) {
    const currentUser = ctx.auth.user
    if (!currentUser) {
      throw new UnauthorizedException()
    }
    const userId = currentUser.id

    const execCtx = ExecutionContext.fromHttp(ctx)

    const [
      { user, completeness },
      spiderChartData,
      deliveryMetrics,
      featuredReviews,
      currentSnapshot,
    ] = await Promise.all([
      new GetUserProfileQuery(execCtx).handle(buildGetUserProfileDTO(userId)),
      new GetSpiderChartDataQuery(execCtx).handle(buildGetSpiderChartDataDTO(userId)),
      new GetUserDeliveryMetricsQuery(execCtx).handle(buildGetUserDeliveryMetricsDTO(userId)),
      new GetFeaturedReviewsQuery(execCtx).handle(buildGetFeaturedReviewsDTO(userId, 2)),
      new GetCurrentProfileSnapshotQuery(execCtx).handle(buildGetCurrentProfileSnapshotDTO(userId)),
    ])

    return ctx.inertia.render(
      'profile/show',
      mapProfileShowPageProps({
        user,
        completeness,
        spiderChartData,
        deliveryMetrics,
        featuredReviews,
        currentSnapshot: currentSnapshot.snapshot,
      })
    )
  }
}
