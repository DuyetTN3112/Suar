// import User from '#models/user'
import type { HttpContext } from '@adonisjs/core/http'
import AuditLog from '#models/audit_log'
import db from '@adonisjs/lucid/services/db'

export default class DeleteUser {
  constructor(protected ctx: HttpContext) {}

  async handle({ id }: { id: number }) {
    const currentUser = this.ctx.auth.user
    if (!currentUser) {
      return {
        success: false,
        message: 'Unauthorized',
      }
    }
    // Kiểm tra không thể xóa chính mình
    if (currentUser.id === id) {
      return {
        success: false,
        message: 'Bạn không thể xóa tài khoản của chính mình',
      }
    }

    try {
      // Sử dụng stored procedure từ MySQL
      await db.rawQuery('CALL delete_user_with_permission(?, ?)', [currentUser.id, id])

      // Ghi log hành động
      await AuditLog.create({
        user_id: currentUser.id,
        action: 'delete',
        entity_type: 'user',
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
