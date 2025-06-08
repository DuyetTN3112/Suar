import type { ExecutionContext } from '#types/execution_context'
import { BaseCommand } from '#actions/shared/base_command'
import type { UpdateUserDetailsDTO } from '../dtos/request/update_user_details_dto.js'
import User from '#models/user'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import emitter from '@adonisjs/core/services/emitter'

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
export default class UpdateUserDetailsCommand extends BaseCommand<UpdateUserDetailsDTO, User> {
  constructor(execCtx: ExecutionContext) {
    super(execCtx)
  }

  /**
   * Execute the command to update user details
   */
  async handle(dto: UpdateUserDetailsDTO): Promise<User> {
    const userId = this.getCurrentUserId()
    if (!userId) {
      throw new UnauthorizedException()
    }

    return await this.executeInTransaction(async (trx) => {
      // Load user within transaction
      const userRecord = await User.query({ client: trx }).where('id', userId).firstOrFail()

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
      userRecord.merge({
        avatar_url: dto.avatar_url !== undefined ? dto.avatar_url : userRecord.avatar_url,
        bio: dto.bio !== undefined ? dto.bio : userRecord.bio,
        phone: dto.phone !== undefined ? dto.phone : userRecord.phone,
        address: dto.address !== undefined ? dto.address : userRecord.address,
        timezone: dto.timezone !== undefined ? dto.timezone : userRecord.timezone,
        language: dto.language !== undefined ? dto.language : userRecord.language,
        is_freelancer:
          dto.is_freelancer !== undefined ? dto.is_freelancer : userRecord.is_freelancer,
      })
      await userRecord.useTransaction(trx).save()

      // Log audit
      await this.logAudit('update', 'user', userId, oldValues, {
        avatar_url: dto.avatar_url,
        bio: dto.bio,
        phone: dto.phone,
        address: dto.address,
        timezone: dto.timezone,
        language: dto.language,
        is_freelancer: dto.is_freelancer,
      })

      // Emit domain event
      void emitter.emit('user:profile:updated', {
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
      })

      return userRecord
    })
  }
}
