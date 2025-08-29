import type { HttpContext } from '@adonisjs/core/http'

import { mapProfileEditPageProps } from './mappers/response/user_response_mapper.js'

import UnauthorizedException from '#exceptions/unauthorized_exception'
import GetProfileEditPageQuery from '#modules/users/actions/queries/get_profile_edit_page_query'
import { ExecutionContext } from '#types/execution_context'

/**
 * GET /profile/edit → Display profile edit form
 */
export default class EditProfileController {
  async handle(ctx: HttpContext) {
    const currentUser = ctx.auth.user
    if (!currentUser) {
      throw new UnauthorizedException()
    }
    const page = await new GetProfileEditPageQuery(ExecutionContext.fromHttp(ctx)).execute({
      userId: currentUser.id,
    })

    return ctx.inertia.render('profile/edit', mapProfileEditPageProps(page))
  }
}
