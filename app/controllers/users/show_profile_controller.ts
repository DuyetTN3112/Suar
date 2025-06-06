import type { HttpContext } from '@adonisjs/core/http'
import GetUserProfileQuery, {
  GetUserProfileDTO,
} from '#actions/users/queries/get_user_profile_query'
import GetSpiderChartDataQuery, {
  GetSpiderChartDataDTO,
} from '#actions/users/queries/get_spider_chart_data_query'
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

    const [{ user, completeness }, spiderChartData] = await Promise.all([
      new GetUserProfileQuery(ctx).handle(new GetUserProfileDTO(userId)),
      new GetSpiderChartDataQuery(ctx).handle(new GetSpiderChartDataDTO(userId)),
    ])

    return ctx.inertia.render('profile/show', {
      user: user.serialize(),
      completeness,
      spiderChartData,
    })
  }
}
