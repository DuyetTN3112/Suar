import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { mapProfileViewPageProps } from './mappers/response/user_response_mapper.js'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { UserProfilePageQueryFactory } from '#modules/users/actions/ports/inbound/user_profile_page_query_factory'

/**
 * GET /users/:id/profile → View another user's public profile
 */
@inject()
export default class ViewUserProfileController {
  constructor(private readonly profilePages: UserProfilePageQueryFactory) {}

  async handle(ctx: HttpContext) {
    const { params } = ctx
    const page = await this.profilePages.makeView(actionContextFromHttp(ctx)).execute({
      userId: params['userId'] as string,
      currentUserId: ctx.auth.user?.id ?? null,
    })

    return ctx.inertia.render('profile/view', mapProfileViewPageProps(page))
  }
}
