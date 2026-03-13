import type { ExecutionContext } from '#types/execution_context'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import AuditLog from '#models/mongo/audit_log'
import type CreateNotification from '#actions/common/create_notification'
import PermissionService from '#services/permission_service'
import emitter from '@adonisjs/core/services/emitter'
import loggerService from '#services/logger_service'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import type { DatabaseId } from '#types/database'
import { UserStatusName } from '#constants/user_constants'
import { enforcePolicy } from '#actions/shared/rules/enforce_policy'
import { canDeactivateUser } from '../rules/user_management_rules.js'

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
      const isSuperadmin = await PermissionService.isSystemSuperadmin(adminUserId, trx)
      enforcePolicy(
        canDeactivateUser({
          actorId: adminUserId,
          targetUserId: dto.user_id,
          isActorSuperadmin: isSuperadmin,
        })
      )

      // 3. Load user
      const user = await User.query({ client: trx })
        .where('id', dto.user_id)
        .whereNull('deleted_at')
        .firstOrFail()

      // Save old status
      const oldStatus = user.status

      // 4. Update user status to inactive
      user.status = UserStatusName.INACTIVE
      await user.useTransaction(trx).save()

      // 5. Create audit log
      await AuditLog.create({
        user_id: adminUserId,
        action: 'deactivate_user',
        entity_type: 'users',
        entity_id: dto.user_id,
        old_values: { status: oldStatus },
        new_values: { status: UserStatusName.INACTIVE, reason: dto.reason },
        ip_address: this.execCtx.ip,
        user_agent: this.execCtx.userAgent,
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
        message: `Tài khoản của bạn đã bị vô hiệu hóa. Lý do: ${reason || 'Không có lý do cụ thể'}`,
        type: 'account_deactivated',
        related_entity_type: 'user',
        related_entity_id: userId,
      })
    } catch (error) {
      loggerService.error('[DeactivateUserCommand] Failed to send notification:', error)
    }
  }
}
