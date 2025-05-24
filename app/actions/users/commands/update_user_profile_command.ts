import { BaseCommand } from '../../shared/base_command.js'
import { UpdateUserProfileDTO } from '../dtos/update_user_profile_dto.js'
import User from '#models/user'

/**
 * UpdateUserProfileCommand
 *
 * Updates user profile information (username, email only).
 * This command handles partial updates - only provided fields are updated.
 */
export default class UpdateUserProfileCommand extends BaseCommand<UpdateUserProfileDTO, User> {
  async handle(dto: UpdateUserProfileDTO): Promise<User> {
    return await this.executeInTransaction(async (_trx) => {
      const user = await User.findOrFail(dto.userId)
      const oldValues = user.toJSON()

      // Build updates object
      const updates: Partial<{
        username: string
        email: string
      }> = {}

      if (dto.username) updates.username = dto.username
      if (dto.email) updates.email = dto.email

      // Update user
      if (Object.keys(updates).length > 0) {
        user.merge(updates)
        await user.save()
      }

      await this.logAudit('update', 'user', user.id, oldValues, user.toJSON())

      return user
    })
  }
}
