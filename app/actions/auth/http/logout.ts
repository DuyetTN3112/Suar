import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import AuditLogging, { ActionType, EntityType } from '#actions/common/audit_logging'

export default class Logout {
  constructor(private ctx: HttpContext) {}

  async handle() {
    try {
      const user = this.ctx.auth.user!
      // Khởi tạo AuditLogging trực tiếp thay vì dùng dependency injection
      const auditLogging = new AuditLogging(this.ctx)

      // Ghi log đăng xuất
      await auditLogging.log({
        action: ActionType.LOGOUT,
        entity_type: EntityType.USER,
        entity_id: user.id,
        metadata: {
          timestamp: new Date(),
          user_email: user.email,
        },
      })

      // Đăng xuất
      await this.ctx.auth.use('web').logout()
      // Xóa dữ liệu phiên liên quan đến xác thực
      this.ctx.session.forget('auth')
      // Xóa dữ liệu người dùng khỏi Inertia props
      if (this.ctx.inertia) {
        this.ctx.inertia.share({
          auth: {
            user: null,
          },
        })
      }
      // Xóa các cookie phiên làm việc khác nếu cần
      // this.ctx.response.clearCookie('remember_web')
      console.log('Đăng xuất thành công')
    } catch (error) {
      console.error('Lỗi khi đăng xuất:', error)
    }
  }
}
