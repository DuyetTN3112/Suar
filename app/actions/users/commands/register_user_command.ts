import { inject } from '@adonisjs/core'
import { BaseCommand } from '../../shared/base_command.js'
import type { RegisterUserDTO } from '../dtos/request/register_user_dto.js'
import type User from '#models/user'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { SystemRoleName } from '#constants/user_constants'
import emitter from '@adonisjs/core/services/emitter'
import UserRepository from '#infra/users/repositories/user_repository'

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
@inject()
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

      // Emit audit event
      void emitter.emit('audit:log', {
        userId: user.id,
        action: 'create',
        entityType: 'user',
        entityId: user.id,
        newValues: { username: dto.username, email: dto.email },
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
    return await UserRepository.create(
      {
        username: dto.username,
        email: dto.email,
        system_role: dto.roleId || SystemRoleName.REGISTERED_USER,
        status: dto.statusId,
      },
      trx
    )
  }
}
