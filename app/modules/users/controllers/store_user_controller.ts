import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { buildRegisterUserDTO } from './mappers/request/user_request_mapper.js'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { UserAccountActionFactory } from '#modules/users/actions/ports/inbound/user_account_action_factory'

/**
 * POST /users → Store new user (register)
 */
@inject()
export default class StoreUserController {
  constructor(private readonly actions: UserAccountActionFactory) {}

  async handle(ctx: HttpContext) {
    const registerUserCommand = this.actions.makeRegister(actionContextFromHttp(ctx))
    const { request, response, session, i18n } = ctx

    const dto = buildRegisterUserDTO(request, ctx.auth.user?.system_role ?? null)

    await registerUserCommand.handle(dto)

    session.flash('success', i18n.t('messages.user_created_successfully'))
    response.redirect().toRoute('users.index')
  }
}
