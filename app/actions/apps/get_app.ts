import App from '#models/app'
import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'

@inject()
export default class GetApp {
  constructor(protected ctx: HttpContext) {}

  async handle({ id }: { id: number }) {
    const app = await App.query()
      .where('id', id)
      .whereNull('deleted_at')
      .preload('category')
      .firstOrFail()
    // Lấy số lượng người dùng kết nối
    const connectedUsersCount = await app
      .related('user_apps')
      .query()
      .where('is_connected', true)
      .count('id as count')
      .first()
    app.$extras.connected_users_count = connectedUsersCount?.$extras.count || 0
    return app
  }
}
