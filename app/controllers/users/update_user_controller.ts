import type { HttpContext } from '@adonisjs/core/http'
import UpdateUserProfileCommand from '#actions/users/commands/update_user_profile_command'
import { ExecutionContext } from '#types/execution_context'
import { buildUpdateUserProfileDTO } from './mapper/request/user_request_mapper.js'

/**
 * PUT /users/:id → Update user profile
 */
export default class UpdateUserController {
  async handle(ctx: HttpContext) {
    const updateUserProfileCommand = new UpdateUserProfileCommand(ExecutionContext.fromHttp(ctx))
    const { params, request, response, session, i18n } = ctx
    const userId = String(params.id)

    const dto = buildUpdateUserProfileDTO(request, userId)

    await updateUserProfileCommand.handle(dto)

    session.flash('success', i18n.t('messages.user_updated_successfully'))
    response.redirect().toRoute('users.show', { id: userId })
  }
}
