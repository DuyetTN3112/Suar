import AppCategory from '#models/app_category'
import App from '#models/app'
import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import AuditLog from '#models/audit_log'

@inject()
export default class DeleteAppCategory {
  constructor(protected ctx: HttpContext) {}

  async handle({ id }: { id: number }) {
    const user = this.ctx.auth.user!
    // Kiểm tra xem danh mục có ứng dụng không
    const appsCount = await App.query()
      .where('category_id', id)
      .whereNull('deleted_at')
      .count('id as count')
      .first()
    if (appsCount && appsCount.$extras.count > 0) {
      throw new Error('Không thể xóa danh mục đang chứa ứng dụng')
    }
    // Tìm danh mục cần xóa
    const category = await AppCategory.findOrFail(id)
    const oldData = JSON.stringify(category.toJSON())
    // Xóa danh mục
    await category.delete()
    // Ghi log hành động
    await AuditLog.create({
      user_id: user.id,
      action: 'delete',
      entity_type: 'app_category',
      entity_id: id,
      old_values: JSON.parse(oldData),
      ip_address: this.ctx.request.ip(),
      user_agent: this.ctx.request.header('user-agent'),
    })
    return true
  }
}
