import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
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
import GetCurrentProfileSnapshotQuery, {
  GetCurrentProfileSnapshotDTO,
} from '#actions/users/queries/get_current_profile_snapshot_query'
import UnauthorizedException from '#exceptions/unauthorized_exception'

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
      new GetUserProfileQuery(execCtx).handle(new GetUserProfileDTO(userId)),
      new GetSpiderChartDataQuery(execCtx).handle(new GetSpiderChartDataDTO(userId)),
      new GetUserDeliveryMetricsQuery(execCtx).handle(new GetUserDeliveryMetricsDTO(userId)),
      new GetFeaturedReviewsQuery(execCtx).handle(new GetFeaturedReviewsDTO(userId, 2)),
      new GetCurrentProfileSnapshotQuery(execCtx).handle(new GetCurrentProfileSnapshotDTO(userId)),
    ])

    // user may be a Lucid model (fresh) or plain object (from cache)
    const serializedUser = typeof user.serialize === 'function' ? user.serialize() : user

    return ctx.inertia.render('profile/show', {
      user: serializedUser,
      completeness,
      spiderChartData,
      deliveryMetrics,
      featuredReviews,
      currentSnapshot: currentSnapshot.snapshot,
    })
  }
}
