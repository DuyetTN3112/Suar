import type { HttpContext } from '@adonisjs/core/http'

import { mapProfileShowPageProps } from './mappers/response/user_response_mapper.js'

import GetProfileShowPageQuery from '#actions/users/queries/get_profile_show_page_query'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import { ExecutionContext } from '#types/execution_context'

/**
 * GET /profile → Display user's own profile
 */
export default class ShowProfileController {
  async handle(ctx: HttpContext) {
    const currentUser = ctx.auth.user
    if (!currentUser) {
      throw new UnauthorizedException()
    }
    const page = await new GetProfileShowPageQuery(ExecutionContext.fromHttp(ctx)).execute({
      userId: currentUser.id,
    })

    return ctx.inertia.render('profile/show', mapProfileShowPageProps(page))
  }
}
