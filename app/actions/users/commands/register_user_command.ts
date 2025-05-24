import { BaseCommand } from '../../shared/base_command.js'
import { RegisterUserDTO } from '../dtos/register_user_dto.js'
import User from '#models/user'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

/**
 * RegisterUserCommand
 *
 * Registers a new user in the system.
 *
 * This is a Command (Write operation) that changes system state.
 * Follows the User Intent: "Register a new user" (not just "Create User")
 *
 * @example
 * ```typescript
 * const dto = new RegisterUserDTO('johndoe', 'john@example.com', 2, 1)
 * const user = await registerUserCommand.handle(dto)
 * ```
 */
export default class RegisterUserCommand extends BaseCommand<RegisterUserDTO, User> {
  /**
   * Main handler - creates user account
   * Uses transaction to ensure data consistency
   */
  async handle(dto: RegisterUserDTO): Promise<User> {
    return await this.executeInTransaction(async (trx) => {
      // Create user account
      const user = await this.createUserAccount(dto, trx)

      // Log audit trail
      await this.logAudit('create', 'user', user.id, undefined, user.toJSON())

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
        username: dto.username,
        email: dto.email,
        role_id: dto.roleId,
        status_id: dto.statusId,
      },
      { client: trx }
    )
  }
}
