import { BaseCommand } from '../../base_command.js'
import type { RegisterUserDTO } from '../../dtos/request/register_user_dto.js'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import { serializeUserLifecycleTimestamp } from '#modules/users/actions/mappers/user_lifecycle_timestamp_mapper'
import type { UserAccountRepository } from '#modules/users/actions/ports/outbound/user_account_repository'
import type { UserLifecycleEventStager } from '#modules/users/actions/ports/outbound/user_lifecycle_event_stager'
import type { UserRuntime } from '#modules/users/actions/ports/outbound/user_runtime'
import type {
  UserTransaction,
  UserTransactionRunner,
} from '#modules/users/actions/ports/outbound/user_transaction'
import type { UserActionContext } from '#modules/users/actions/user_action_context'
import { SystemRoleName } from '#modules/users/public_contracts/user_constants'
import type { UserRecord } from '#modules/users/types/user_records'

const REGISTERED_USER_ROLE: string = SystemRoleName.REGISTERED_USER
const SUPERADMIN_ROLE: string = SystemRoleName.SUPERADMIN

export function assertCanGrantSystemRole(
  actorSystemRole: string | null,
  requestedSystemRole: string
): void {
  if (requestedSystemRole === REGISTERED_USER_ROLE) {
    return
  }

  if (actorSystemRole !== SUPERADMIN_ROLE) {
    throw ForbiddenException.onlySuperAdmin('gán vai trò hệ thống đặc quyền')
  }
}

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
export default class RegisterUserCommand extends BaseCommand<RegisterUserDTO, UserRecord> {
  constructor(
    execCtx: UserActionContext,
    transactions: UserTransactionRunner,
    private readonly users: UserAccountRepository,
    private readonly runtime: UserRuntime,
    private readonly lifecycleEvents: UserLifecycleEventStager
  ) {
    super(execCtx, transactions)
  }

  /**
   * Main handler - creates user account
   * Uses transaction to ensure data consistency
   */
  async handle(dto: RegisterUserDTO): Promise<UserRecord> {
    const lifecycleMutationId = this.runtime.createId()
    const result = await this.executeInTransaction(async (trx) => {
      const requestedSystemRole = dto.roleId.trim() || REGISTERED_USER_ROLE
      const actorSystemRole =
        requestedSystemRole === REGISTERED_USER_ROLE || !this.execCtx.userId
          ? null
          : await this.users.getSystemRoleName(this.execCtx.userId, trx)
      assertCanGrantSystemRole(actorSystemRole, requestedSystemRole)

      // Create user account
      const user = await this.createUserAccount(dto, requestedSystemRole, trx)

      // Log audit trail
      if (this.execCtx.userId) {
        await auditPublicApi.write(
          this.execCtx,
          {
            user_id: this.execCtx.userId,
            action: 'create',
            critical: true,
            entity_type: 'user',
            entity_id: user.id,
            old_values: undefined,
            new_values: user,
          },
          trx
        )
      }

      await this.lifecycleEvents.stageAccountLifecycle(trx, {
        mutationId: lifecycleMutationId,
        action: 'registered',
        userId: user.id,
        actorId: this.execCtx.userId ?? user.id,
        occurredAt: serializeUserLifecycleTimestamp(user.created_at, 'created_at'),
      })
      return user
    })

    return result
  }

  /**
   * Private subtask: Create user account
   */
  private async createUserAccount(
    dto: RegisterUserDTO,
    systemRole: string,
    trx: UserTransaction
  ): Promise<UserRecord> {
    return this.users.create(
      {
        username: dto.username,
        email: dto.email,
        system_role: systemRole,
        status: dto.statusId,
      },
      trx
    )
  }
}
