import AppCategory from '#models/app_category'
import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import AuditLog from '#models/audit_log'

type CategoryData = {
  name?: string
  description?: string
}

@inject()
export default class UpdateAppCategory {
  constructor(protected ctx: HttpContext) {}

  async handle({ id, data }: { id: number; data: CategoryData }) {
    const user = this.ctx.auth.user!
    // Tìm danh mục cần cập nhật
    const category = await AppCategory.findOrFail(id)
    const oldData = JSON.stringify(category.toJSON())
    // Cập nhật danh mục
    if (data.name !== undefined) category.name = data.name
    if (data.description !== undefined) category.description = data.description
    await category.save()
    // Ghi log hành động
    await AuditLog.create({
      user_id: user.id,
      action: 'update',
      entity_type: 'app_category',
      entity_id: Number(category.id),
      old_values: JSON.parse(oldData),
      new_values: category.toJSON(),
      ip_address: this.ctx.request.ip(),
      user_agent: this.ctx.request.header('user-agent'),
    })
    return category
  }
}
