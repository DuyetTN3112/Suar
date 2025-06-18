import type { HttpContext } from '@adonisjs/core/http'
import GetUserProfileQuery, {
  GetUserProfileDTO,
} from '#actions/users/queries/get_user_profile_query'
import GetSpiderChartDataQuery, {
  GetSpiderChartDataDTO,
} from '#actions/users/queries/get_spider_chart_data_query'
import GetUserDeliveryMetricsQuery, {
  GetUserDeliveryMetricsDTO,
} from '#actions/users/queries/get_user_delivery_metrics_query'
import GetFeaturedReviewsQuery, {
  GetFeaturedReviewsDTO,
} from '#actions/users/queries/get_featured_reviews_query'
import { ExecutionContext } from '#types/execution_context'

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
        new GetUserProfileQuery(execCtx).handle(new GetUserProfileDTO(userId)),
        new GetSpiderChartDataQuery(execCtx).handle(new GetSpiderChartDataDTO(userId)),
        new GetUserDeliveryMetricsQuery(execCtx).handle(new GetUserDeliveryMetricsDTO(userId)),
        new GetFeaturedReviewsQuery(execCtx).handle(new GetFeaturedReviewsDTO(userId, 2)),
      ])

    const isOwnProfile = ctx.auth.user?.id === userId

    return ctx.inertia.render('profile/view', {
      user: user.serialize(),
      completeness,
      spiderChartData,
      deliveryMetrics,
      featuredReviews,
      isOwnProfile,
    })
  }
}
