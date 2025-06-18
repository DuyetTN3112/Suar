import type { HttpContext } from '@adonisjs/core/http'
import ChangeUserRoleCommand from '#actions/users/commands/change_user_role_command'
import { ChangeUserRoleDTO } from '#actions/users/dtos/request/change_user_role_dto'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import { ExecutionContext } from '#types/execution_context'

/**
 * PUT /users/:id/role → Change user role in organization
 */
export default class UpdateUserRoleController {
  async handle(ctx: HttpContext) {
    const changeUserRoleCommand = new ChangeUserRoleCommand(ExecutionContext.fromHttp(ctx))
    const { params, request, response, auth, session, i18n } = ctx

    const changerId = auth.user?.id
    if (!changerId) {
      throw new UnauthorizedException()
    }

    const dto = new ChangeUserRoleDTO(
      params.id as string,
      request.input('role') as string,
      changerId
    )

    await changeUserRoleCommand.handle(dto)

    session.flash('success', i18n.t('messages.user_role_updated_successfully'))
    response.redirect().back()
  }
}
