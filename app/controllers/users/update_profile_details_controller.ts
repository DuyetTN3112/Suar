import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import UpdateUserDetailsCommand from '#actions/users/commands/update_user_details_command'
import { UpdateUserDetailsDTO } from '#actions/users/dtos/request/update_user_details_dto'

/**
 * PUT /profile/details → Update user details (bio, avatar, freelancer info)
 */
export default class UpdateProfileDetailsController {
  async handle(ctx: HttpContext) {
    const { request, response, session } = ctx

    const dto = new UpdateUserDetailsDTO(request.all())
    const command = new UpdateUserDetailsCommand(ExecutionContext.fromHttp(ctx))
    await command.handle(dto)

    session.flash('success', 'Profile updated successfully')

    response.redirect().back()
  }
}
