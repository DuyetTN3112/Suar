import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'

import CreateAuditLog from '#actions/audit/create_audit_log'
import { enforcePolicy } from '#actions/authorization/enforce_policy'
import type CreateNotification from '#actions/common/create_notification'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
} from '#constants/notification_constants'
import { UserStatusName } from '#constants/user_constants'
import { canDeactivateUser } from '#domain/users/user_management_rules'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import loggerService from '#infra/logger/logger_service'
import UserRepository from '#infra/users/repositories/user_repository'
import type User from '#models/user'
import type { DatabaseId } from '#types/database'
import type { ExecutionContext } from '#types/execution_context'

import { DefaultUserDependencies } from '../ports/user_external_dependencies_impl.js'

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
    private createNotification: CreateNotification
  ) {}

  async execute(dto: DeactivateUserDTO): Promise<User> {
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

      const user = await UserRepository.findNotDeletedOrFail(dto.user_id, trx)

      // Save old status
      const oldStatus = user.status

      // 4. Update user status to inactive
      user.status = UserStatusName.INACTIVE
      await UserRepository.save(user, trx)

      // 5. Create audit log
      await new CreateAuditLog(this.execCtx).handle({
        user_id: adminUserId,
        action: 'deactivate_user',
        entity_type: 'users',
        entity_id: dto.user_id,
        old_values: { status: oldStatus },
        new_values: { status: UserStatusName.INACTIVE, reason: dto.reason },
      })

      await trx.commit()

      // Emit domain event
      void emitter.emit('user:deactivated', {
        userId: dto.user_id,
        deactivatedBy: adminUserId,
        reason: dto.reason,
      })

      // 6. Send notification
      await this.sendNotification(dto.user_id, dto.reason)

      return user
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
