import App from '#models/app'
import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import AuditLog from '#models/audit_log'

type AppData = {
  name: string
  logo: string
  description?: string
  category_id?: number
  connected?: boolean
}

@inject()
export default class CreateApp {
  constructor(protected ctx: HttpContext) {}

  async handle({ data }: { data: AppData }) {
    const user = this.ctx.auth.user!

    // Tạo ứng dụng mới
    const app = await App.create({
      name: data.name,
      logo: data.logo,
      description: data.description,
      category_id: data.category_id,
      connected: data.connected !== undefined ? data.connected : false,
    })

    // Ghi log hành động
    await AuditLog.create({
      user_id: user.id,
      action: 'create',
      entity_type: 'app',
      entity_id: Number(app.id),
      new_values: app.toJSON(),
      ip_address: this.ctx.request.ip(),
      user_agent: this.ctx.request.header('user-agent'),
    })

    return app
  }
}
