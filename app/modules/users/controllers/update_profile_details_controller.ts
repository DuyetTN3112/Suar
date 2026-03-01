import type { HttpContext } from '@adonisjs/core/http'

import { buildUpdateUserDetailsDTO } from './mappers/request/user_request_mapper.js'

import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import UpdateUserDetailsCommand from '#modules/users/actions/commands/update_user_details_command'

/**
 * PUT /profile/details → Update user details (bio, avatar, freelancer info)
 */
export default class UpdateProfileDetailsController {
  async handle(ctx: HttpContext) {
    const { request, response, session } = ctx

    const dto = buildUpdateUserDetailsDTO(request)
    const command = new UpdateUserDetailsCommand(actionContextFromHttp(ctx))
    await command.handle(dto)

    session.flash('success', 'Profile updated successfully')

    response.redirect().back()
  }
}
