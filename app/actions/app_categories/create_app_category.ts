import AppCategory from '#models/app_category'
import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import AuditLog from '#models/audit_log'

type CategoryData = {
  name: string
  description?: string
}

@inject()
export default class CreateAppCategory {
  constructor(protected ctx: HttpContext) {}

  async handle({ data }: { data: CategoryData }) {
    const user = this.ctx.auth.user!

    // Tạo danh mục mới
    const category = await AppCategory.create({
      name: data.name,
      description: data.description,
    })

    // Ghi log hành động
    await AuditLog.create({
      user_id: user.id,
      action: 'create',
      entity_type: 'app_category',
      entity_id: Number(category.id),
      new_values: category.toJSON(),
      ip_address: this.ctx.request.ip(),
      user_agent: this.ctx.request.header('user-agent'),
    })

    return category
  }
}
