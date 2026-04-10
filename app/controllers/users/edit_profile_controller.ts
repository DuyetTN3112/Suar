import type { HttpContext } from '@adonisjs/core/http'
import GetProfileEditPageQuery from '#actions/users/queries/get_profile_edit_page_query'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import { ExecutionContext } from '#types/execution_context'
import { mapProfileEditPageProps } from './mappers/response/user_response_mapper.js'

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
