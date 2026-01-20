import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
} from '#modules/notifications/public_contracts/notification_constants'
import { buildNotificationEventId } from '#modules/notifications/public_contracts/notification_event_identity'
import { BaseCommand } from '#modules/users/actions/base_command'
import { serializeUserLifecycleTimestamp } from '#modules/users/actions/mappers/user_lifecycle_timestamp_mapper'
import type { UserAccountRepository } from '#modules/users/actions/ports/outbound/user_account_repository'
import type { UserPermissionReader } from '#modules/users/actions/ports/outbound/user_external_dependencies'
import type { UserLifecycleEventStager } from '#modules/users/actions/ports/outbound/user_lifecycle_event_stager'
import type { UserNotificationStager } from '#modules/users/actions/ports/outbound/user_notification_stager'
import type { UserRuntime } from '#modules/users/actions/ports/outbound/user_runtime'
import type { UserTransactionRunner } from '#modules/users/actions/ports/outbound/user_transaction'
import type { UserActionContext } from '#modules/users/actions/user_action_context'
import { canDeactivateUser } from '#modules/users/domain/user_management_rules'
import { UserStatusName } from '#modules/users/public_contracts/user_constants'
import type { UserRecord } from '#modules/users/types/user_records'

/**
 * DTO for deactivating a user
 */
export interface DeactivateUserDTO {
  user_id: string
  reason?: string
}

/**
 * Command: Deactivate User
 *
 * Migrate từ stored procedure: deactivate_user
 *
 * Business rules:
 * - Chỉ superadmin mới có thể deactivate users
 * - Không thể deactivate chính mình
 * - Set user.status_id = 2 (inactive)
 * - Gửi notification cho user
 */
export default class DeactivateUserCommand extends BaseCommand<DeactivateUserDTO, UserRecord> {
  constructor(
    execCtx: UserActionContext,
    transactions: UserTransactionRunner,
    private notificationStager: UserNotificationStager,
    private readonly permissionReader: UserPermissionReader,
    private readonly users: UserAccountRepository,
    private readonly runtime: UserRuntime,
    private readonly lifecycleEvents: UserLifecycleEventStager
  ) {
    super(execCtx, transactions)
  }

  async handle(dto: DeactivateUserDTO): Promise<UserRecord> {
    const adminUserId = this.execCtx.userId
    if (!adminUserId) {
      throw new UnauthorizedException()
    }
    const lifecycleMutationId = this.runtime.createId()
    const updatedUser = await this.executeInTransaction(async (trx) => {
      // 1-2. Check permissions via pure rule
      const isSuperadmin = await this.permissionReader.isSystemSuperadmin(
        adminUserId,
        trx
      )
      enforcePolicy(
        canDeactivateUser({
          actorId: adminUserId,
          targetUserId: dto.user_id,
          isActorSuperadmin: isSuperadmin,
        })
      )

      const user = await this.users.findNotDeletedOrFail(dto.user_id, trx)

      // Save old status
      const oldStatus = user.status

      // 4. Update user status to inactive
      const persistedUser = await this.users.update(
        dto.user_id,
        { status: UserStatusName.INACTIVE },
        trx
      )

      // 5. Create audit log
      await auditPublicApi.write(
        this.execCtx,
        {
          user_id: adminUserId,
          action: 'deactivate_user',
          event_name: 'user.account.status_changed',
          event_family: 'user.account',
          module: 'users',
          outcome: 'success',
          entity_type: 'user',
          entity_id: dto.user_id,
          target_type: 'user',
          target_id: dto.user_id,
          old_values: { status: oldStatus },
          new_values: {
            status: UserStatusName.INACTIVE,
            reason_provided: Boolean(dto.reason),
          },
          retention_class: 'user_security_2y',
          critical: true,
        },
        trx
      )

      await this.stageDeactivationNotification(persistedUser, adminUserId, dto.reason, trx)
      await this.lifecycleEvents.stageAccountLifecycle(trx, {
        mutationId: lifecycleMutationId,
        action: 'deactivated',
        userId: dto.user_id,
        actorId: adminUserId,
        occurredAt: serializeUserLifecycleTimestamp(
          persistedUser.updated_at,
          'updated_at'
        ),
      })
      return persistedUser
    })

    return updatedUser
  }

  execute(dto: DeactivateUserDTO): Promise<UserRecord> {
    return this.handle(dto)
  }

  private async stageDeactivationNotification(
    user: UserRecord,
    actorId: string,
    reason: string | undefined,
    trx: Parameters<UserNotificationStager['stage']>[1]['trx']
  ): Promise<void> {
    const occurredAt = serializeUserLifecycleTimestamp(user.updated_at, 'updated_at')
    await this.notificationStager.stage(
      {
        eventId: buildNotificationEventId({
          eventName: 'user.deactivated',
          businessEventId: `${user.id}:${occurredAt}`,
          recipientId: user.id,
        }),
        type: BACKEND_NOTIFICATION_TYPES.ACCOUNT_DEACTIVATED,
        schemaVersion: 1,
        recipientId: user.id,
        scope: { kind: 'user', id: user.id },
        actor: { type: 'user', id: actorId },
        subject: {
          type: BACKEND_NOTIFICATION_ENTITY_TYPES.USER,
          id: user.id,
        },
        parameters: {
          reason: reason ?? null,
        },
        occurredAt,
        correlationId: user.id,
      },
      { trx }
    )
  }
}
