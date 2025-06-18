import AuditLog from '#models/mongo/audit_log'
import User from '#models/user'
import UserRepository from '#infra/users/repositories/user_repository'
import { AuditAction, EntityType } from '#constants/audit_constants'
import { DateTime } from 'luxon'
import type { ExecutionContext } from '#types/execution_context'

export default class DeleteUser {
  constructor(protected execCtx: ExecutionContext) {}

  async handle({ id }: { id: string }) {
    const currentUserId = this.execCtx.userId
    if (!currentUserId) {
      return {
        success: false,
        message: 'Unauthorized',
      }
    }
    // Kiểm tra không thể xóa chính mình
    if (currentUserId === id) {
      return {
        success: false,
        message: 'Bạn không thể xóa tài khoản của chính mình',
      }
    }

    try {
      // Verify current user is superadmin
      const isSuperadmin = await UserRepository.isSuperadmin(currentUserId)
      if (!isSuperadmin) {
        return {
          success: false,
          message: 'Không có quyền xóa người dùng này',
        }
      }

      // Verify target user exists and is not deleted
      const targetUser = await User.query().where('id', id).whereNull('deleted_at').first()

      if (!targetUser) {
        return {
          success: false,
          message: 'Người dùng không tồn tại hoặc đã bị xóa',
        }
      }

      // Soft delete the user (set deleted_at)
      targetUser.deleted_at = DateTime.now()
      await targetUser.save()

      // Ghi log hành động
      await AuditLog.create({
        user_id: currentUserId,
        action: AuditAction.DELETE,
        entity_type: EntityType.USER,
        entity_id: id,
        ip_address: this.execCtx.ip,
        user_agent: this.execCtx.userAgent,
      })

      return {
        success: true,
        message: 'Người dùng đã được xóa thành công',
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Không có quyền xóa người dùng này'
      return {
        success: false,
        message: errorMessage,
      }
    }
  }
}
