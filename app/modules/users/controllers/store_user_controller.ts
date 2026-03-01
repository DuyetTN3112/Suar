import type { HttpContext } from '@adonisjs/core/http'

import { buildRegisterUserDTO } from './mappers/request/user_request_mapper.js'

import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import RegisterUserCommand from '#modules/users/actions/commands/register_user_command'

/**
 * POST /users → Store new user (register)
 */
export default class StoreUserController {
  async handle(ctx: HttpContext) {
    const registerUserCommand = new RegisterUserCommand(actionContextFromHttp(ctx))
    const { request, response, session, i18n } = ctx

    const dto = buildRegisterUserDTO(request)

    await registerUserCommand.handle(dto)

    session.flash('success', i18n.t('messages.user_created_successfully'))
    response.redirect().toRoute('users.index')
  }
}
