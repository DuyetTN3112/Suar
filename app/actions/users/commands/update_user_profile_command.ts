import { inject } from '@adonisjs/core'
import emitter from '@adonisjs/core/services/emitter'

import { BaseCommand } from '../base_command.js'
import type { UpdateUserProfileDTO } from '../dtos/request/update_user_profile_dto.js'

import { auditPublicApi } from '#actions/audit/public_api'
import * as userModelQueries from '#infra/users/repositories/read/model_queries'
import * as userMutations from '#infra/users/repositories/write/user_mutations'
import type { UserRecord } from '#types/user_records'

/**
 * UpdateUserProfileCommand
 *
 * Updates user profile information (username, email only).
 * This command handles partial updates - only provided fields are updated.
 */
@inject()
export default class UpdateUserProfileCommand extends BaseCommand<UpdateUserProfileDTO, UserRecord> {
  async handle(dto: UpdateUserProfileDTO): Promise<UserRecord> {
    const result = await this.executeInTransaction(async (trx) => {
      const user = await userModelQueries.findNotDeletedOrFailRecord(dto.userId, trx)
      const oldValues = { ...user }

      // Build updates object
      const updates: Partial<{
        username: string
        email: string
      }> = {}

      if (dto.username) updates.username = dto.username
      if (dto.email) updates.email = dto.email

      // Update user
      if (Object.keys(updates).length > 0) {
        const updatedUser = await userMutations.updateByIdRecord(user.id, updates, trx)
        return {
          user: updatedUser,
          profileUpdatedEvent: {
            userId: dto.userId,
            changes: updates,
          },
          oldValues,
        }
      }

      return {
        user,
        profileUpdatedEvent: {
          userId: dto.userId,
          changes: updates,
        },
        oldValues,
      }
    })

    if (this.execCtx.userId) {
      await auditPublicApi.write(this.execCtx, {
        user_id: this.execCtx.userId,
        action: 'update',
        entity_type: 'user',
        entity_id: result.user.id,
        old_values: result.oldValues,
        new_values: result.user,
      })
    }

    void emitter.emit('user:profile:updated', result.profileUpdatedEvent)

    return result.user
  }
}
