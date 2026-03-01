import type { HttpContext } from '@adonisjs/core/http'

import { mapProfileShowPageProps } from './mappers/response/user_response_mapper.js'

import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import GetProfileShowPageQuery from '#modules/users/actions/queries/get_profile_show_page_query'

/**
 * GET /profile → Display user's own profile
 */
export default class ShowProfileController {
  async handle(ctx: HttpContext) {
    const currentUser = ctx.auth.user
    if (!currentUser) {
      throw new UnauthorizedException()
    }
    const page = await new GetProfileShowPageQuery(actionContextFromHttp(ctx)).execute({
      userId: currentUser.id,
    })

    return ctx.inertia.render('profile/show', mapProfileShowPageProps(page))
  }
}
