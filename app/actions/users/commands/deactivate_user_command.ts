import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import AuditLog from '#models/audit_log'
import type CreateNotification from '#actions/common/create_notification'
import PermissionService from '#services/permission_service'

/**
 * DTO for deactivating a user
 */
export interface DeactivateUserDTO {
  user_id: number
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
    protected ctx: HttpContext,
    private createNotification: CreateNotification
  ) {}

  async execute(dto: DeactivateUserDTO): Promise<User> {
    const adminUser = this.ctx.auth.user
    if (!adminUser) {
      throw new Error('Unauthorized')
    }
    const trx = await db.transaction()

    try {
      // 1. Check admin is superadmin
      const isSuperadmin = await PermissionService.isSystemSuperadmin(adminUser.id, trx)
      if (!isSuperadmin) {
        throw new Error('Chỉ superadmin mới có thể deactivate users')
      }

      // 2. Cannot deactivate self
      if (adminUser.id === dto.user_id) {
        throw new Error('Không thể deactivate chính mình')
      }

      // 3. Load user
      const user = await User.query({ client: trx })
        .where('id', dto.user_id)
        .whereNull('deleted_at')
        .firstOrFail()

      // Save old status
      const oldStatusId = user.status_id

      // 4. Update user status to inactive
      user.status_id = 2 // inactive
      await user.useTransaction(trx).save()

      // 5. Create audit log
      await AuditLog.create(
        {
          user_id: adminUser.id,
          action: 'deactivate_user',
          entity_type: 'users',
          entity_id: dto.user_id,
          old_values: { status_id: oldStatusId },
          new_values: { status_id: 2, reason: dto.reason },
          ip_address: this.ctx.request.ip(),
          user_agent: this.ctx.request.header('user-agent') || '',
        },
        { client: trx }
      )

      await trx.commit()

      // 6. Send notification
      await this.sendNotification(dto.user_id, dto.reason)

      return user
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  private async sendNotification(userId: number, reason?: string): Promise<void> {
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
      console.error('[DeactivateUserCommand] Failed to send notification:', error)
    }
  }
}
