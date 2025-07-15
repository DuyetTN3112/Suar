import type { HttpContext } from '@adonisjs/core/http'

import { mapProfileViewPageProps } from './mappers/response/user_response_mapper.js'

import GetProfileViewPageQuery from '#actions/users/queries/get_profile_view_page_query'
import { ExecutionContext } from '#types/execution_context'

/**
 * GET /users/:id/profile → View another user's public profile
 */
export default class ViewUserProfileController {
  async handle(ctx: HttpContext) {
    const { params } = ctx
    const page = await new GetProfileViewPageQuery(ExecutionContext.fromHttp(ctx)).execute({
      userId: params.id as string,
      currentUserId: ctx.auth.user?.id ?? null,
    })

    return ctx.inertia.render('profile/view', mapProfileViewPageProps(page))
  }
}
