import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import UpdateUserProfileCommand from '#actions/users/commands/update_user_profile_command'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import { buildUpdateProfileSettingsDTO } from './mapper/request/settings_request_mapper.js'
import { getProfileSettingsUpdatedMessage } from './mapper/response/settings_response_mapper.js'

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
    const dto = buildUpdateProfileSettingsDTO(request, user.id)
    const command = new UpdateUserProfileCommand(ExecutionContext.fromHttp(ctx))
    await command.handle(dto)

    session.flash('success', getProfileSettingsUpdatedMessage())
    response.redirect().back()
  }
}
