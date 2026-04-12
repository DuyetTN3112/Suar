import type { HttpContext } from '@adonisjs/core/http'

import { buildUpdateAccountSettingsDTO } from './mappers/request/settings_request_mapper.js'
import { getAccountSettingsUpdatedMessage } from './mappers/response/settings_response_mapper.js'

import UpdateUserProfileCommand from '#actions/users/commands/update_user_profile_command'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import { ExecutionContext } from '#types/execution_context'

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
    const dto = buildUpdateAccountSettingsDTO(request, user.id, user.email)
    const command = new UpdateUserProfileCommand(ExecutionContext.fromHttp(ctx))
    await command.handle(dto)

    session.flash('success', getAccountSettingsUpdatedMessage())
    response.redirect().back()
  }
}
