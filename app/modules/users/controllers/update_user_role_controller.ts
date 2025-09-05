import type { HttpContext } from '@adonisjs/core/http'

import { buildChangeUserRoleDTO } from './mappers/request/user_request_mapper.js'

import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import ChangeUserRoleCommand from '#modules/users/actions/commands/change_user_role_command'

/**
 * PUT /users/:id/role → Change user role in organization
 */
export default class UpdateUserRoleController {
  async handle(ctx: HttpContext) {
    const changeUserRoleCommand = new ChangeUserRoleCommand(actionContextFromHttp(ctx))
    const { params, request, response, auth, session, i18n } = ctx

    const changerId = auth.user?.id
    if (!changerId) {
      throw new UnauthorizedException()
    }

    const dto = buildChangeUserRoleDTO(request, params.id as string, changerId)

    await changeUserRoleCommand.handle(dto)

    session.flash('success', i18n.t('messages.user_role_updated_successfully'))
    response.redirect().back()
  }
}
