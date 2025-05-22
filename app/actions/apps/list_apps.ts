import App from '#models/app'
import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'

type FilterOptions = {
  page?: number
  limit?: number
  category_id?: number
  connected?: boolean
  search?: string
}

@inject()
export default class ListApps {
  constructor(protected ctx: HttpContext) {}

  async handle(options: FilterOptions = {}) {
    const page = options.page || 1
    const limit = options.limit || 10
    const query = App.query().whereNull('deleted_at').preload('category').orderBy('name', 'asc')
    // Thêm điều kiện tìm kiếm nếu có
    if (options.category_id) {
      query.where('category_id', options.category_id)
    }
    if (options.connected !== undefined) {
      query.where('connected', options.connected)
    }
    if (options.search) {
      query.where((builder) => {
        builder
          .where('name', 'LIKE', `%${options.search}%`)
          .orWhere('description', 'LIKE', `%${options.search}%`)
      })
    }
    return await query.paginate(page, limit)
  }
}
