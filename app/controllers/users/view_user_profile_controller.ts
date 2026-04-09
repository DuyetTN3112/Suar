import type { HttpContext } from '@adonisjs/core/http'
import GetUserProfileQuery from '#actions/users/queries/get_user_profile_query'
import GetSpiderChartDataQuery from '#actions/users/queries/get_spider_chart_data_query'
import GetUserDeliveryMetricsQuery from '#actions/users/queries/get_user_delivery_metrics_query'
import GetFeaturedReviewsQuery from '#actions/users/queries/get_featured_reviews_query'
import { ExecutionContext } from '#types/execution_context'
import {
  buildGetFeaturedReviewsDTO,
  buildGetSpiderChartDataDTO,
  buildGetUserDeliveryMetricsDTO,
  buildGetUserProfileDTO,
} from './mapper/request/user_request_mapper.js'
import { mapProfileViewPageProps } from './mapper/response/user_response_mapper.js'

/**
 * GET /users/:id/profile → View another user's public profile
 */
export default class ViewUserProfileController {
  async handle(ctx: HttpContext) {
    const { params } = ctx
    const userId = params.id as string
    const execCtx = ExecutionContext.fromHttp(ctx)

    const [{ user, completeness }, spiderChartData, deliveryMetrics, featuredReviews] =
      await Promise.all([
        new GetUserProfileQuery(execCtx).handle(buildGetUserProfileDTO(userId)),
        new GetSpiderChartDataQuery(execCtx).handle(buildGetSpiderChartDataDTO(userId)),
        new GetUserDeliveryMetricsQuery(execCtx).handle(buildGetUserDeliveryMetricsDTO(userId)),
        new GetFeaturedReviewsQuery(execCtx).handle(buildGetFeaturedReviewsDTO(userId, 2)),
      ])

    const isOwnProfile = ctx.auth.user?.id === userId

    return ctx.inertia.render(
      'profile/view',
      mapProfileViewPageProps({
        user,
        completeness,
        spiderChartData,
        deliveryMetrics,
        featuredReviews,
        isOwnProfile,
      })
    )
  }
}
