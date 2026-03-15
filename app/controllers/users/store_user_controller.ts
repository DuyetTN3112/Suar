import type { HttpContext } from '@adonisjs/core/http'
import RegisterUserCommand from '#actions/users/commands/register_user_command'
import { RegisterUserDTO } from '#actions/users/dtos/request/register_user_dto'

/**
 * POST /users → Store new user (register)
 */
export default class StoreUserController {
  async handle(ctx: HttpContext) {
    const registerUserCommand = new RegisterUserCommand(ctx)
    const { request, response, session, i18n } = ctx

    const dto = new RegisterUserDTO(
      request.input('username') as string,
      request.input('email') as string,
      request.input('role') as string,
      request.input('status') as string
    )

    await registerUserCommand.handle(dto)

    session.flash('success', i18n.t('messages.user_created_successfully'))
    response.redirect().toRoute('users.index')
  }
}
