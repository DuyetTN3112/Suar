import emitter from '@adonisjs/core/services/emitter'

import type { UpdateUserDetailsDTO } from '../dtos/request/update_user_details_dto.js'

import { auditPublicApi } from '#actions/audit/public_api'
import { BaseCommand } from '#actions/users/base_command'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import * as userModelQueries from '#infra/users/repositories/read/model_queries'
import * as userMutations from '#infra/users/repositories/write/user_mutations'
import type { UserRecord } from '#types/user_records'

/**
 * UpdateUserDetailsCommand
 *
 * Command for updating user profile details.
 * v3: All detail fields are now directly on the users table.
 *
 * Business Rules:
 * - User can only update their own details
 * - Uses transaction for data consistency
 * - Logs audit trail for tracking changes
 */
export default class UpdateUserDetailsCommand extends BaseCommand<UpdateUserDetailsDTO, UserRecord> {
  /**
   * Execute the command to update user details
   */
  async handle(dto: UpdateUserDetailsDTO): Promise<UserRecord> {
    const userId = this.getCurrentUserId()
    if (!userId) {
      throw new UnauthorizedException()
    }

    const result = await this.executeInTransaction(async (trx) => {
      const userRecord = await userModelQueries.findNotDeletedOrFailRecord(userId, trx)

      const oldValues = {
        avatar_url: userRecord.avatar_url,
        bio: userRecord.bio,
        phone: userRecord.phone,
        address: userRecord.address,
        timezone: userRecord.timezone,
        language: userRecord.language,
        is_freelancer: userRecord.is_freelancer,
      }

      // Update fields directly on user record (v3: no separate user_details table)
      const updates = {
        avatar_url: dto.avatar_url !== undefined ? dto.avatar_url : userRecord.avatar_url,
        bio: dto.bio !== undefined ? dto.bio : userRecord.bio,
        phone: dto.phone !== undefined ? dto.phone : userRecord.phone,
        address: dto.address !== undefined ? dto.address : userRecord.address,
        timezone: dto.timezone ?? userRecord.timezone,
        language: dto.language ?? userRecord.language,
        is_freelancer: dto.is_freelancer ?? userRecord.is_freelancer,
      }
      const updatedUserRecord = await userMutations.updateByIdRecord(userId, updates, trx)

      // Log audit
      if (this.execCtx.userId) {
        await auditPublicApi.write(this.execCtx, {
          user_id: this.execCtx.userId,
          action: 'update',
          entity_type: 'user',
          entity_id: userId,
          old_values: oldValues,
          new_values: {
            avatar_url: dto.avatar_url,
            bio: dto.bio,
            phone: dto.phone,
            address: dto.address,
            timezone: dto.timezone,
            language: dto.language,
            is_freelancer: dto.is_freelancer,
          },
        })
      }

      return {
        userRecord: updatedUserRecord,
        profileUpdatedEvent: {
          userId,
          changes: {
            avatar_url: dto.avatar_url,
            bio: dto.bio,
            phone: dto.phone,
            address: dto.address,
            timezone: dto.timezone,
            language: dto.language,
            is_freelancer: dto.is_freelancer,
          },
        },
      }
    })

    void emitter.emit('user:profile:updated', result.profileUpdatedEvent)

    return result.userRecord
  }
}
