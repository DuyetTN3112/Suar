import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { buildUpdateUserProfileDTO } from './mappers/request/user_request_mapper.js'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { UserAccountActionFactory } from '#modules/users/actions/ports/inbound/user_account_action_factory'

/**
 * PUT /users/:id → Update user profile
 */
@inject()
export default class UpdateUserController {
  constructor(private readonly actions: UserAccountActionFactory) {}

  async handle(ctx: HttpContext) {
    const updateUserProfileCommand = this.actions.makeUpdateProfile(actionContextFromHttp(ctx))
    const { params, request, response, session, i18n } = ctx
    const userId = String(params['userId'])

    const dto = buildUpdateUserProfileDTO(request, userId)

    await updateUserProfileCommand.handle(dto)

    session.flash('success', i18n.t('messages.user_updated_successfully'))
    response.redirect().toRoute('users.show', [userId])
  }
}
