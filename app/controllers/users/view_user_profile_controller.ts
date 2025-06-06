import type { HttpContext } from '@adonisjs/core/http'
import GetUserProfileQuery, {
  GetUserProfileDTO,
} from '#actions/users/queries/get_user_profile_query'
import GetSpiderChartDataQuery, {
  GetSpiderChartDataDTO,
} from '#actions/users/queries/get_spider_chart_data_query'

/**
 * GET /users/:id/profile → View another user's public profile
 */
export default class ViewUserProfileController {
  async handle(ctx: HttpContext) {
    const { params } = ctx
    const userId = params.id as string

    const [{ user, completeness }, spiderChartData] = await Promise.all([
      new GetUserProfileQuery(ctx).handle(new GetUserProfileDTO(userId)),
      new GetSpiderChartDataQuery(ctx).handle(new GetSpiderChartDataDTO(userId)),
    ])

    const isOwnProfile = ctx.auth.user?.id === userId

    return ctx.inertia.render('profile/view', {
      user: user.serialize(),
      completeness,
      spiderChartData,
      isOwnProfile,
    })
  }
}
