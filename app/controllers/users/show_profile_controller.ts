import type { HttpContext } from '@adonisjs/core/http'
import GetUserProfileQuery, {
  GetUserProfileDTO,
} from '#actions/users/queries/get_user_profile_query'
import GetSpiderChartDataQuery, {
  GetSpiderChartDataDTO,
} from '#actions/users/queries/get_spider_chart_data_query'
import { calculateProfileCompleteness } from '#actions/users/utils/profile_completeness'
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

    const query = new GetUserProfileQuery(ctx)
    const user = await query.handle(new GetUserProfileDTO(userId))

    const spiderChartQuery = new GetSpiderChartDataQuery(ctx)
    const spiderChartData = await spiderChartQuery.handle(new GetSpiderChartDataDTO(userId))

    const completeness = calculateProfileCompleteness(user.serialize())

    return ctx.inertia.render('profile/show', {
      user: user.serialize(),
      completeness,
      spiderChartData,
    })
  }
}
