import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { buildChangeUserRoleDTO } from './mappers/request/user_request_mapper.js'

import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { UserAccountActionFactory } from '#modules/users/actions/ports/inbound/user_account_action_factory'

/**
 * PUT /users/:id/role → Change user role in organization
 */
@inject()
export default class UpdateUserRoleController {
  constructor(private readonly actions: UserAccountActionFactory) {}

  async handle(ctx: HttpContext) {
    const changeUserRoleCommand = this.actions.makeChangeRole(actionContextFromHttp(ctx))
    const { params, request, response, auth, session, i18n } = ctx

    const changerId = auth.user?.id
    if (!changerId) {
      throw new UnauthorizedException()
    }

    const dto = buildChangeUserRoleDTO(request, params['userId'] as string, changerId)

    await changeUserRoleCommand.handle(dto)

    session.flash('success', i18n.t('messages.user_role_updated_successfully'))
    response.redirect().back()
  }
}
