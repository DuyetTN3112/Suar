import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import AuditLog from '#models/audit_log'
import db from '@adonisjs/lucid/services/db'
import { AuditAction, EntityType } from '#constants/audit_constants'
import { DateTime } from 'luxon'

@inject()
export default class DeleteUser {
  constructor(protected ctx: HttpContext) {}

  async handle({ id }: { id: string }) {
    const currentUser = this.ctx.auth.user
    if (!currentUser) {
      return {
        success: false,
        message: 'Unauthorized',
      }
    }
    // Kiểm tra không thể xóa chính mình
    if (String(currentUser.id) === String(id)) {
      return {
        success: false,
        message: 'Bạn không thể xóa tài khoản của chính mình',
      }
    }

    try {
      // Verify current user is superadmin (replaces stored procedure permission check)
      const currentUserData = await db
        .from('users')
        .join('system_roles', 'users.system_role_id', 'system_roles.id')
        .where('users.id', currentUser.id)
        .select('system_roles.name as role_name')
        .first()

      if (!currentUserData || currentUserData.role_name?.toLowerCase() !== 'superadmin') {
        return {
          success: false,
          message: 'Không có quyền xóa người dùng này',
        }
      }

      // Verify target user exists and is not deleted
      const targetUser = await db.from('users').where('id', id).whereNull('deleted_at').first()

      if (!targetUser) {
        return {
          success: false,
          message: 'Người dùng không tồn tại hoặc đã bị xóa',
        }
      }

      // Soft delete the user (set deleted_at)
      await db.from('users').where('id', id).update({
        deleted_at: DateTime.now().toSQL(),
      })

      // Ghi log hành động
      await AuditLog.create({
        user_id: currentUser.id,
        action: AuditAction.DELETE,
        entity_type: EntityType.USER,
        entity_id: id,
        ip_address: this.ctx.request.ip(),
        user_agent: this.ctx.request.header('user-agent'),
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
