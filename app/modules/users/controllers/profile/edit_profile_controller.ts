import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { mapProfileEditPageProps } from '../mappers/response/user_response_mapper.js'

import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { UserProfileActionFactory } from '#modules/users/actions/ports/inbound/user_profile_action_factory'

/**
 * GET /profile/edit → Display profile edit form
 */
@inject()
export default class EditProfileController {
  constructor(private readonly profileActions: UserProfileActionFactory) {}

  async handle(ctx: HttpContext) {
    const currentUser = ctx.auth.user
    if (!currentUser) {
      throw new UnauthorizedException()
    }
    const page = await this.profileActions
      .makeEditPage(actionContextFromHttp(ctx))
      .executeAndWrap({ userId: currentUser.id })
      .then((outcome) => outcome.getValue())

    return ctx.inertia.render('profile/edit', mapProfileEditPageProps(page))
  }
}
