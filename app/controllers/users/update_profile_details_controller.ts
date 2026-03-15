import type { HttpContext } from '@adonisjs/core/http'
import UpdateUserDetailsCommand from '#actions/users/commands/update_user_details_command'
import { UpdateUserDetailsDTO } from '#actions/users/dtos/request/update_user_details_dto'

/**
 * PUT /profile/details → Update user details (bio, avatar, freelancer info)
 */
export default class UpdateProfileDetailsController {
  async handle(ctx: HttpContext) {
    const { request, response, session } = ctx

    try {
      const dto = new UpdateUserDetailsDTO(request.all())
      const command = new UpdateUserDetailsCommand(ctx)
      await command.handle(dto)

      session.flash('success', 'Profile updated successfully')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update profile'
      session.flash('error', message)
    }

    response.redirect().back()
  }
}
