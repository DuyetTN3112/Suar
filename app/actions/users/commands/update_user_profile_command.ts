import { inject } from '@adonisjs/core'
import { BaseCommand } from '../../shared/base_command.js'
import type { UpdateUserProfileDTO } from '../dtos/request/update_user_profile_dto.js'
import type User from '#models/user'
import UserRepository from '#infra/users/repositories/user_repository'
import emitter from '@adonisjs/core/services/emitter'

/**
 * UpdateUserProfileCommand
 *
 * Updates user profile information (username, email only).
 * This command handles partial updates - only provided fields are updated.
 */
@inject()
export default class UpdateUserProfileCommand extends BaseCommand<UpdateUserProfileDTO, User> {
  async handle(dto: UpdateUserProfileDTO): Promise<User> {
    const result = await this.executeInTransaction(async (trx) => {
      const user = await UserRepository.findNotDeletedOrFail(dto.userId, trx)
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
        await UserRepository.save(user, trx)
      }

      await this.logAudit('update', 'user', user.id, oldValues, user.toJSON())

      return {
        user,
        profileUpdatedEvent: {
          userId: dto.userId,
          changes: updates,
        },
      }
    })

    void emitter.emit('user:profile:updated', result.profileUpdatedEvent)

    return result.user
  }
}
