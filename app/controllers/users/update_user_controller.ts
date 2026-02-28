import type { HttpContext } from '@adonisjs/core/http'
import type UpdateUserProfileCommand from '#actions/users/commands/update_user_profile_command'
import { UpdateUserProfileDTO } from '#actions/users/dtos/update_user_profile_dto'

/**
 * PUT /users/:id → Update user profile
 */
export default class UpdateUserController {
  async handle(ctx: HttpContext, updateUserProfileCommand: UpdateUserProfileCommand) {
    const { params, request, response, session, i18n } = ctx

    const dto = new UpdateUserProfileDTO(
      params.id as string,
      request.input('username') as string | undefined,
      request.input('email') as string | undefined
    )

    await updateUserProfileCommand.handle(dto)

    session.flash('success', i18n.t('messages.user_updated_successfully'))
    response.redirect().toRoute('users.show', { id: params.id })
  }
}
