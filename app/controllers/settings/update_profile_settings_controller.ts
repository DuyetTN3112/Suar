import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import UpdateUserProfileCommand from '#actions/users/commands/update_user_profile_command'
import { UpdateUserProfileDTO } from '#actions/users/dtos/request/update_user_profile_dto'
import UnauthorizedException from '#exceptions/unauthorized_exception'

/**
 * POST /settings/profile → Update profile settings
 */
export default class UpdateProfileSettingsController {
  async handle(ctx: HttpContext) {
    const { request, response, auth, session } = ctx

    const user = auth.user
    if (!user) {
      throw new UnauthorizedException()
    }
    const data = request.only(['username', 'email']) as { username?: string; email?: string }
    const dto = new UpdateUserProfileDTO(user.id, data.username, data.email)
    const command = new UpdateUserProfileCommand(ExecutionContext.fromHttp(ctx))
    await command.handle(dto)

    session.flash('success', 'Thông tin hồ sơ đã được cập nhật thành công')
    response.redirect().back()
  }
}
