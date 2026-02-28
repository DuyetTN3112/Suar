import type { HttpContext } from '@adonisjs/core/http'
import type ChangeUserRoleCommand from '#actions/users/commands/change_user_role_command'
import { ChangeUserRoleDTO } from '#actions/users/dtos/change_user_role_dto'
import UnauthorizedException from '#exceptions/unauthorized_exception'

/**
 * PUT /users/:id/role → Change user role in organization
 */
export default class UpdateUserRoleController {
  async handle(ctx: HttpContext, changeUserRoleCommand: ChangeUserRoleCommand) {
    const { params, request, response, auth, session, i18n } = ctx

    try {
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
      return
    } catch (error: unknown) {
      session.flash(
        'error',
        error instanceof Error ? error.message : 'Chỉ superadmin mới có thể thay đổi vai trò'
      )
      response.redirect().back()
      return
    }
  }
}
