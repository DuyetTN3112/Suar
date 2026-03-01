import type { HttpContext } from '@adonisjs/core/http'

import { buildUpdateUserProfileDTO } from './mappers/request/user_request_mapper.js'

import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import UpdateUserProfileCommand from '#modules/users/actions/commands/update_user_profile_command'

/**
 * PUT /users/:id → Update user profile
 */
export default class UpdateUserController {
  async handle(ctx: HttpContext) {
    const updateUserProfileCommand = new UpdateUserProfileCommand(actionContextFromHttp(ctx))
    const { params, request, response, session, i18n } = ctx
    const userId = String(params.id)

    const dto = buildUpdateUserProfileDTO(request, userId)

    await updateUserProfileCommand.handle(dto)

    session.flash('success', i18n.t('messages.user_updated_successfully'))
    response.redirect().toRoute('users.show', { id: userId })
  }
}
