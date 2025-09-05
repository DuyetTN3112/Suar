import type { HttpContext } from '@adonisjs/core/http'

import { mapProfileEditPageProps } from './mappers/response/user_response_mapper.js'

import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import GetProfileEditPageQuery from '#modules/users/actions/queries/get_profile_edit_page_query'

/**
 * GET /profile/edit → Display profile edit form
 */
export default class EditProfileController {
  async handle(ctx: HttpContext) {
    const currentUser = ctx.auth.user
    if (!currentUser) {
      throw new UnauthorizedException()
    }
    const page = await new GetProfileEditPageQuery(actionContextFromHttp(ctx)).execute({
      userId: currentUser.id,
    })

    return ctx.inertia.render('profile/edit', mapProfileEditPageProps(page))
  }
}
