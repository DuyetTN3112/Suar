import type { HttpContext } from '@adonisjs/core/http'
import RegisterUserCommand from '#actions/users/commands/register_user_command'
import { ExecutionContext } from '#types/execution_context'
import { buildRegisterUserDTO } from './mappers/request/user_request_mapper.js'

/**
 * POST /users → Store new user (register)
 */
export default class StoreUserController {
  async handle(ctx: HttpContext) {
    const registerUserCommand = new RegisterUserCommand(ExecutionContext.fromHttp(ctx))
    const { request, response, session, i18n } = ctx

    const dto = buildRegisterUserDTO(request)

    await registerUserCommand.handle(dto)

    session.flash('success', i18n.t('messages.user_created_successfully'))
    response.redirect().toRoute('users.index')
  }
}
