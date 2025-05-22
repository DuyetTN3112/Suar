import App from '#models/app'
import UserApp from '#models/user_app'
import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import AuditLog from '#models/audit_log'
import { DateTime } from 'luxon'

@inject()
export default class DeleteApp {
  constructor(protected ctx: HttpContext) {}

  async handle({ id }: { id: number }) {
    const user = this.ctx.auth.user!
    // Tìm ứng dụng cần xóa
    const app = await App.findOrFail(id)
    const oldData = JSON.stringify(app.toJSON())
    // Kiểm tra liên kết người dùng
    const userAppsCount = await UserApp.query().where('app_id', id).count('id as count').first()
    if (userAppsCount && userAppsCount.$extras.count > 0) {
      // Ngắt kết nối tất cả người dùng
      await UserApp.query().where('app_id', id).update({
        is_connected: false,
        disconnected_at: DateTime.now(),
        updated_at: DateTime.now(),
      })
    }

    // Soft delete ứng dụng
    app.deleted_at = DateTime.now()
    await app.save()

    // Ghi log hành động
    await AuditLog.create({
      user_id: user.id,
      action: 'delete',
      entity_type: 'app',
      entity_id: id,
      old_values: JSON.parse(oldData),
      ip_address: this.ctx.request.ip(),
      user_agent: this.ctx.request.header('user-agent'),
    })
    return true
  }
}
