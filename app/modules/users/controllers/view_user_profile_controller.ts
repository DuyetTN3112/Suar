import type { HttpContext } from '@adonisjs/core/http'

import { mapProfileViewPageProps } from './mappers/response/user_response_mapper.js'

import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import GetProfileViewPageQuery from '#modules/users/actions/queries/get_profile_view_page_query'

/**
 * GET /users/:id/profile → View another user's public profile
 */
export default class ViewUserProfileController {
  async handle(ctx: HttpContext) {
    const { params } = ctx
    const page = await new GetProfileViewPageQuery(actionContextFromHttp(ctx)).execute({
      userId: params.id as string,
      currentUserId: ctx.auth.user?.id ?? null,
    })

    return ctx.inertia.render('profile/view', mapProfileViewPageProps(page))
  }
}
