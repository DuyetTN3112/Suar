import type { HttpContext } from '@adonisjs/core/http'
import GetUserProfileQuery, {
  GetUserProfileDTO,
} from '#actions/users/queries/get_user_profile_query'
import GetSpiderChartDataQuery, {
  GetSpiderChartDataDTO,
} from '#actions/users/queries/get_spider_chart_data_query'
import { calculateProfileCompleteness } from '#actions/users/utils/profile_completeness'

/**
 * GET /users/:id/profile → View another user's public profile
 */
export default class ViewUserProfileController {
  async handle(ctx: HttpContext) {
    const { params } = ctx
    const userId = params.id as string

    const query = new GetUserProfileQuery(ctx)
    const user = await query.handle(new GetUserProfileDTO(userId))

    const spiderChartQuery = new GetSpiderChartDataQuery(ctx)
    const spiderChartData = await spiderChartQuery.handle(new GetSpiderChartDataDTO(userId))

    const isOwnProfile = ctx.auth.user?.id === userId
    const completeness = calculateProfileCompleteness(user.serialize())

    return ctx.inertia.render('profile/view', {
      user: user.serialize(),
      completeness,
      spiderChartData,
      isOwnProfile,
    })
  }
}
