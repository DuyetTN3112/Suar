import { inject } from '@adonisjs/core'
import emitter from '@adonisjs/core/services/emitter'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { BaseCommand } from '../base_command.js'
import type { RegisterUserDTO } from '../dtos/request/register_user_dto.js'

import { auditPublicApi } from '#actions/audit/public_api'
import * as userMutations from '#infra/users/repositories/write/user_mutations'
import { SystemRoleName } from '#modules/users/constants/user_constants'
import type { UserRecord } from '#types/user_records'

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
export default class RegisterUserCommand extends BaseCommand<RegisterUserDTO, UserRecord> {
  /**
   * Main handler - creates user account
   * Uses transaction to ensure data consistency
   */
  async handle(dto: RegisterUserDTO): Promise<UserRecord> {
    const result = await this.executeInTransaction(async (trx) => {
      // Create user account
      const user = await this.createUserAccount(dto, trx)

      // Log audit trail
      if (this.execCtx.userId) {
        await auditPublicApi.write(this.execCtx, {
          user_id: this.execCtx.userId,
          action: 'create',
          entity_type: 'user',
          entity_id: user.id,
          old_values: undefined,
          new_values: user,
        })
      }

      return {
        user,
        auditEvent: {
          userId: user.id,
          action: 'create',
          entityType: 'user',
          entityId: user.id,
          newValues: { username: dto.username, email: dto.email },
        },
      }
    })

    void emitter.emit('audit:log', result.auditEvent)

    return result.user
  }

  /**
   * Private subtask: Create user account
   */
  private async createUserAccount(
    dto: RegisterUserDTO,
    trx: TransactionClientContract
  ): Promise<UserRecord> {
    return await userMutations.createRecord(
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
