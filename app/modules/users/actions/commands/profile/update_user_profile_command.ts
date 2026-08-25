import { BaseCommand } from '../../base_command.js'
import type { UpdateUserProfileDTO } from '../../dtos/request/update_user_profile_dto.js'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import { serializeUserLifecycleTimestamp } from '#modules/users/actions/mappers/user_lifecycle_timestamp_mapper'
import type { UserAccountRepository } from '#modules/users/actions/ports/outbound/user_account_repository'
import type { UserLifecycleEventStager } from '#modules/users/actions/ports/outbound/user_lifecycle_event_stager'
import type { UserRuntime } from '#modules/users/actions/ports/outbound/user_runtime'
import type { UserTransactionRunner } from '#modules/users/actions/ports/outbound/user_transaction'
import type { UserActionContext } from '#modules/users/actions/user_action_context'
import { SystemRoleName } from '#modules/users/public_contracts/user_constants'
import type { UserRecord } from '#modules/users/types/user_records'

export function assertProfileMutationAllowed(
  actorId: string | null,
  targetUserId: string,
  actorSystemRole: string | null
): void {
  const isSelf = Boolean(actorId && targetUserId && actorId === targetUserId)
  const isSystemAdministrator = [SystemRoleName.SYSTEM_ADMIN, SystemRoleName.SUPERADMIN].includes(
    actorSystemRole as SystemRoleName
  )

  if (!isSelf && !isSystemAdministrator) {
    throw new ForbiddenException('Bạn không có quyền cập nhật hồ sơ người dùng này')
  }
}

/**
 * UpdateUserProfileCommand
 *
 * Updates user profile information (username, email only).
 * This command handles partial updates - only provided fields are updated.
 */
export default class UpdateUserProfileCommand extends BaseCommand<
  UpdateUserProfileDTO,
  UserRecord
> {
  constructor(
    execCtx: UserActionContext,
    transactions: UserTransactionRunner,
    private readonly users: UserAccountRepository,
    private readonly runtime: UserRuntime,
    private readonly lifecycleEvents: UserLifecycleEventStager
  ) {
    super(execCtx, transactions)
  }

  async handle(dto: UpdateUserProfileDTO): Promise<UserRecord> {
    const lifecycleMutationId = this.runtime.createId()
    const result = await this.executeInTransaction(async (trx) => {
      const actorId = this.execCtx.userId
      const actorSystemRole =
        actorId && actorId !== dto.userId
          ? await this.users.getSystemRoleName(actorId, trx)
          : null
      assertProfileMutationAllowed(actorId, dto.userId, actorSystemRole)

      const user = await this.users.findNotDeletedOrFail(dto.userId, trx)

      // Build updates object
      const updates: Partial<{
        username: string
        email: string
      }> = {}

      if (dto.username && dto.username !== user.username) updates.username = dto.username
      if (dto.email && dto.email !== user.email) updates.email = dto.email

      // Update user
      if (Object.keys(updates).length > 0) {
        const oldValues = {
          ...(updates.username !== undefined ? { username: user.username } : {}),
          ...(updates.email !== undefined ? { email: '[REDACTED:OLD]' } : {}),
        }
        const newValues = {
          ...(updates.username !== undefined ? { username: updates.username } : {}),
          ...(updates.email !== undefined ? { email: '[REDACTED:NEW]' } : {}),
        }
        const updatedUser = await this.users.update(user.id, updates, trx)
        await auditPublicApi.write(
          this.execCtx,
          {
            user_id: this.execCtx.userId ?? user.id,
            action: 'update',
            event_name: 'user.profile.updated',
            event_family: 'user.profile',
            module: 'users',
            outcome: 'success',
            entity_type: 'user',
            entity_id: updatedUser.id,
            target_type: 'user',
            target_id: updatedUser.id,
            old_values: oldValues,
            new_values: newValues,
            retention_class: 'user_security_2y',
            critical: true,
          },
          trx
        )
        await this.lifecycleEvents.stageProfileChanged(trx, {
          mutationId: lifecycleMutationId,
          userId: updatedUser.id,
          actorId: this.execCtx.userId ?? updatedUser.id,
          changedFields: Object.keys(updates),
          occurredAt: serializeUserLifecycleTimestamp(
            updatedUser.updated_at,
            'updated_at'
          ),
        })
        return {
          user: updatedUser,
        }
      }

      return {
        user,
      }
    })

    return result.user
  }
}
