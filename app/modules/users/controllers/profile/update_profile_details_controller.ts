import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { buildUpdateUserDetailsDTO } from '../mappers/request/profile/user_request_mapper.js'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { UserAccountActionFactory } from '#modules/users/actions/ports/inbound/user_account_action_factory'

/**
 * PUT /profile/details → Update user details (bio, avatar, external_contributor info)
 */
@inject()
export default class UpdateProfileDetailsController {
  constructor(private readonly actions: UserAccountActionFactory) {}

  async handle(ctx: HttpContext) {
    const { request, response, session } = ctx

    const dto = buildUpdateUserDetailsDTO(request)
    const command = this.actions.makeUpdateDetails(actionContextFromHttp(ctx))
    await command.executeAndWrap(dto).then((outcome) => outcome.getValue())

    session.flash('success', 'Profile updated successfully')

    response.redirect().back()
  }
}
