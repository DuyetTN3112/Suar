import App from '#models/app'
import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import AuditLog from '#models/audit_log'

type AppData = {
  name?: string
  logo?: string
  description?: string
  category_id?: number | null
  connected?: boolean
}

@inject()
export default class UpdateApp {
  constructor(protected ctx: HttpContext) {}

  async handle({ id, data }: { id: number; data: AppData }) {
    const user = this.ctx.auth.user!
    // Tìm ứng dụng cần cập nhật
    const app = await App.findOrFail(id)
    const oldData = app.toJSON()
    // Cập nhật ứng dụng
    if (data.name !== undefined) app.name = data.name
    if (data.logo !== undefined) app.logo = data.logo
    if (data.description !== undefined) app.description = data.description
    if (data.category_id !== undefined) app.category_id = data.category_id
    if (data.connected !== undefined) app.connected = data.connected
    await app.save()
    // Ghi log hành động
    await AuditLog.create({
      user_id: user.id,
      action: 'update',
      entity_type: 'app',
      entity_id: Number(app.id),
      old_values: oldData,
      new_values: app.toJSON(),
      ip_address: this.ctx.request.ip(),
      user_agent: this.ctx.request.header('user-agent'),
    })
    return app
  }
}
