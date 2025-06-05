import type { HttpContext } from '@adonisjs/core/http'
import UpdateUserProfileCommand from '#actions/users/commands/update_user_profile_command'
import { UpdateUserProfileDTO } from '#actions/users/dtos/request/update_user_profile_dto'
import UnauthorizedException from '#exceptions/unauthorized_exception'

/**
 * POST /settings/profile → Update profile settings
 */
export default class UpdateProfileSettingsController {
  async handle(ctx: HttpContext) {
    const { request, response, auth, session } = ctx

    try {
      const user = auth.user
      if (!user) {
        throw new UnauthorizedException()
      }
      const data = request.only(['username', 'email']) as { username?: string; email?: string }
      const dto = new UpdateUserProfileDTO(user.id, data.username, data.email)
      const command = new UpdateUserProfileCommand(ctx)
      await command.handle(dto)

      session.flash('success', 'Thông tin hồ sơ đã được cập nhật thành công')
      response.redirect().back()
      return
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Có lỗi xảy ra khi cập nhật hồ sơ'
      session.flash('error', errorMessage)
      response.redirect().back()
      return
    }
  }
}
