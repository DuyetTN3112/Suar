import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'

import { DefaultUserDependencies } from '../ports/user_external_dependencies_impl.js'

import { auditPublicApi } from '#actions/audit/public_api'
import { enforcePolicy } from '#actions/authorization/public_api'
import type { NotificationCreator } from '#actions/notifications/public_api'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import loggerService from '#infra/logger/logger_service'
import * as userModelQueries from '#infra/users/repositories/read/model_queries'
import * as userMutations from '#infra/users/repositories/write/user_mutations'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
} from '#modules/notifications/constants/notification_constants'
import { UserStatusName } from '#modules/users/constants/user_constants'
import { canDeactivateUser } from '#modules/users/domain/user_management_rules'
import type { DatabaseId } from '#types/database'
import type { ExecutionContext } from '#types/execution_context'
import type { UserRecord } from '#types/user_records'

/**
 * DTO for deactivating a user
 */
export interface DeactivateUserDTO {
  user_id: DatabaseId
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
export default class DeactivateUserCommand {
  constructor(
    protected execCtx: ExecutionContext,
    private createNotification: NotificationCreator
  ) {}

  async execute(dto: DeactivateUserDTO): Promise<UserRecord> {
    const adminUserId = this.execCtx.userId
    if (!adminUserId) {
      throw new UnauthorizedException()
    }
    const trx = await db.transaction()

    try {
      // 1-2. Check permissions via pure rule
      const isSuperadmin = await DefaultUserDependencies.permission.isSystemSuperadmin(
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

      const user = await userModelQueries.findNotDeletedOrFailRecord(dto.user_id, trx)

      // Save old status
      const oldStatus = user.status

      // 4. Update user status to inactive
      const updatedUser = await userMutations.updateStatusRecord(
        dto.user_id,
        UserStatusName.INACTIVE,
        trx
      )

      // 5. Create audit log
      await auditPublicApi.log(
        {
          user_id: adminUserId,
          action: 'deactivate_user',
          entity_type: 'users',
          entity_id: dto.user_id,
          old_values: { status: oldStatus },
          new_values: { status: UserStatusName.INACTIVE, reason: dto.reason },
        },
        this.execCtx
      )

      await trx.commit()

      // Emit domain event
      void emitter.emit('user:deactivated', {
        userId: dto.user_id,
        deactivatedBy: adminUserId,
        reason: dto.reason,
      })

      // 6. Send notification
      await this.sendNotification(dto.user_id, dto.reason)

      return updatedUser
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  private async sendNotification(userId: DatabaseId, reason?: string): Promise<void> {
    try {
      await this.createNotification.handle({
        user_id: userId,
        title: 'Tài khoản đã bị vô hiệu hóa',
        message: `Tài khoản của bạn đã bị vô hiệu hóa. Lý do: ${reason ?? 'Không có lý do cụ thể'}`,
        type: BACKEND_NOTIFICATION_TYPES.ACCOUNT_DEACTIVATED,
        related_entity_type: BACKEND_NOTIFICATION_ENTITY_TYPES.USER,
        related_entity_id: userId,
      })
    } catch (error) {
      loggerService.error('[DeactivateUserCommand] Failed to send notification:', error)
    }
  }
}
