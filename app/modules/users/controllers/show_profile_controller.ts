import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { mapProfileShowPageProps } from './mappers/response/user_response_mapper.js'

import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { UserProfilePageQueryFactory } from '#modules/users/actions/ports/inbound/user_profile_page_query_factory'

/**
 * GET /profile → Display user's own profile
 */
@inject()
export default class ShowProfileController {
  constructor(private readonly profilePages: UserProfilePageQueryFactory) {}

  async handle(ctx: HttpContext) {
    const currentUser = ctx.auth.user
    if (!currentUser) {
      throw new UnauthorizedException()
    }
    const page = await this.profilePages.makeShow(actionContextFromHttp(ctx)).execute({
      userId: currentUser.id,
    })

    return ctx.inertia.render('profile/show', mapProfileShowPageProps(page))
  }
}
