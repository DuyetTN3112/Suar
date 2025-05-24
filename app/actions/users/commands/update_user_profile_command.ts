import { BaseCommand } from '../../shared/base_command.js'
import { UpdateUserProfileDTO } from '../dtos/update_user_profile_dto.js'
import User from '#models/user'
import UserDetail from '#models/user_detail'
import UserProfile from '#models/user_profile'
import { DateTime } from 'luxon'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

/**
 * UpdateUserProfileCommand
 *
 * Updates user profile information including personal details.
 * This command handles partial updates - only provided fields are updated.
 *
 * This is a Command (Write operation) that changes system state.
 *
 * @example
 * ```typescript
 * const dto = new UpdateUserProfileDTO(
 *   userId,
 *   'John',
 *   'Doe',
 *   '+84123456789'
 * )
 * const user = await updateUserProfileCommand.handle(dto)
 * ```
 */
export default class UpdateUserProfileCommand extends BaseCommand<UpdateUserProfileDTO, User> {
  /**
   * Main handler - orchestrates the profile update process
   */
  async handle(dto: UpdateUserProfileDTO): Promise<User> {
    return await this.executeInTransaction(async (trx) => {
      // Step 1: Get existing user
      const user = await User.findOrFail(dto.userId)
      const oldValues = user.toJSON()

      // Step 2: Update user basic info
      if (dto.firstName || dto.lastName) {
        await this.updateUserBasicInfo(user, dto, trx)
      }

      // Step 3: Update user details
      await this.updateUserDetails(dto.userId, dto, trx)

      // Step 4: Update user profile
      if (dto.language || dto.dateOfBirth) {
        await this.updateUserProfile(dto.userId, dto, trx)
      }

      // Step 5: Reload user with relations
      await user.refresh()

      // Step 6: Log audit trail
      await this.logAudit('update', 'user', user.id, oldValues, user.toJSON())

      return user
    })
  }

  /**
   * Private subtask: Update user basic information
   */
  private async updateUserBasicInfo(
    user: User,
    dto: UpdateUserProfileDTO,
    trx: TransactionClientContract
  ): Promise<void> {
    const updates: Partial<User> = {}

    if (dto.firstName) updates.first_name = dto.firstName
    if (dto.lastName) updates.last_name = dto.lastName

    if (Object.keys(updates).length > 0) {
      user.useTransaction(trx)
      await user.merge(updates).save()
    }
  }

  /**
   * Private subtask: Update user details
   */
  private async updateUserDetails(
    userId: number,
    dto: UpdateUserProfileDTO,
    trx: TransactionClientContract
  ): Promise<void> {
    const userDetail = await UserDetail.query({ client: trx })
      .where('user_id', userId)
      .firstOrFail()

    const updates: Partial<UserDetail> = {}

    if (dto.phoneNumber !== undefined) updates.phone_number = dto.phoneNumber
    if (dto.bio !== undefined) updates.bio = dto.bio

    if (Object.keys(updates).length > 0) {
      await userDetail.merge(updates).save()
    }
  }

  /**
   * Private subtask: Update user profile
   */
  private async updateUserProfile(
    userId: number,
    dto: UpdateUserProfileDTO,
    trx: TransactionClientContract
  ): Promise<void> {
    const userProfile = await UserProfile.query({ client: trx })
      .where('user_id', userId)
      .firstOrFail()

    const updates: Partial<UserProfile> = {}

    if (dto.language) updates.language = dto.language
    if (dto.dateOfBirth) {
      updates.date_of_birth = DateTime.fromISO(dto.dateOfBirth)
    }

    if (Object.keys(updates).length > 0) {
      await userProfile.merge(updates).save()
    }
  }
}
