import { BaseCommand } from '../../shared/base_command.js'
import { RegisterUserDTO } from '../dtos/register_user_dto.js'
import User from '#models/user'
import UserDetail from '#models/user_detail'
import UserProfile from '#models/user_profile'
import UserSetting from '#models/user_setting'
import { DateTime } from 'luxon'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

/**
 * RegisterUserCommand
 *
 * Registers a new user in the system with all associated data:
 * - User account
 * - User profile
 * - User details
 * - Default settings
 *
 * This is a Command (Write operation) that changes system state.
 * Follows the User Intent: "Register a new user" (not just "Create User")
 *
 * @example
 * ```typescript
 * const dto = new RegisterUserDTO(
 *   'John', 'Doe', 'johndoe', 'john@example.com',
 *   'password123', 2, 1
 * )
 * const user = await registerUserCommand.handle(dto)
 * ```
 */
export default class RegisterUserCommand extends BaseCommand<RegisterUserDTO, User> {
  /**
   * Main handler - orchestrates the user registration process
   * Uses transaction to ensure data consistency
   */
  async handle(dto: RegisterUserDTO): Promise<User> {
    return await this.executeInTransaction(async (trx) => {
      // Step 1: Create user account
      const user = await this.createUserAccount(dto, trx)

      // Step 2: Create user details
      await this.createUserDetails(user.id, dto, trx)

      // Step 3: Create user profile
      await this.createUserProfile(user.id, dto, trx)

      // Step 4: Create default settings
      await this.createDefaultSettings(user.id, trx)

      // Step 5: Log audit trail
      await this.logAudit('create', 'user', user.id, undefined, {
        ...user.toJSON(),
        password: '[REDACTED]',
      })

      return user
    })
  }

  /**
   * Private subtask: Create user account
   */
  private async createUserAccount(
    dto: RegisterUserDTO,
    trx: TransactionClientContract
  ): Promise<User> {
    return await User.create(
      {
        first_name: dto.firstName,
        last_name: dto.lastName,
        username: dto.username,
        email: dto.email,
        password: dto.password,
        role_id: dto.roleId,
        status_id: dto.statusId,
      },
      { client: trx }
    )
  }

  /**
   * Private subtask: Create user details
   */
  private async createUserDetails(
    userId: number,
    dto: RegisterUserDTO,
    trx: TransactionClientContract
  ): Promise<void> {
    await UserDetail.create(
      {
        user_id: userId,
        phone_number: dto.phoneNumber,
        bio: dto.bio,
      },
      { client: trx }
    )
  }

  /**
   * Private subtask: Create user profile
   */
  private async createUserProfile(
    userId: number,
    dto: RegisterUserDTO,
    trx: TransactionClientContract
  ): Promise<void> {
    await UserProfile.create(
      {
        user_id: userId,
        language: dto.language || 'vi',
        date_of_birth: dto.dateOfBirth ? DateTime.fromISO(dto.dateOfBirth) : null,
      },
      { client: trx }
    )
  }

  /**
   * Private subtask: Create default settings
   */
  private async createDefaultSettings(
    userId: number,
    trx: TransactionClientContract
  ): Promise<void> {
    await UserSetting.create(
      {
        user_id: userId,
        theme: 'light',
        notifications_enabled: true,
        display_mode: 'grid',
      },
      { client: trx }
    )
  }
}
