import type { HttpContext } from '@adonisjs/core/http'

import { buildUpdateProfileSettingsDTO } from './mappers/request/settings_request_mapper.js'
import { getProfileSettingsUpdatedMessage } from './mappers/response/settings_response_mapper.js'

import UpdateUserProfileCommand from '#actions/users/commands/update_user_profile_command'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import { ExecutionContext } from '#types/execution_context'

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
