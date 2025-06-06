import type { HttpContext } from '@adonisjs/core/http'
import UpdateUserProfileCommand from '#actions/users/commands/update_user_profile_command'
import { UpdateUserProfileDTO } from '#actions/users/dtos/request/update_user_profile_dto'
import UnauthorizedException from '#exceptions/unauthorized_exception'

/**
 * POST /settings/account → Update account settings
 */
export default class UpdateAccountSettingsController {
  async handle(ctx: HttpContext) {
    const { request, response, auth, session } = ctx

    const user = auth.user
    if (!user) {
      throw new UnauthorizedException()
    }
    const data = request.only(['email']) as { email?: string }
    const dto = new UpdateUserProfileDTO(
      user.id,
      undefined,
      data.email || (user.email ?? undefined)
    )
    const command = new UpdateUserProfileCommand(ctx)
    await command.handle(dto)

    session.flash('success', 'Thông tin tài khoản đã được cập nhật thành công')
    response.redirect().back()
  }
}
