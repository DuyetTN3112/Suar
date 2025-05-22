import AppCategory from '#models/app_category'
import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'

type FilterOptions = {
  page?: number
  limit?: number
  search?: string
}

@inject()
export default class ListAppCategories {
  constructor(protected ctx: HttpContext) {}

  async handle(options: FilterOptions = {}) {
    const page = options.page || 1
    const limit = options.limit || 10
    const query = AppCategory.query().orderBy('name', 'asc')

    // Thêm điều kiện tìm kiếm nếu có
    if (options.search) {
      query.where((builder) => {
        builder
          .where('name', 'LIKE', `%${options.search}%`)
          .orWhere('slug', 'LIKE', `%${options.search}%`)
          .orWhere('description', 'LIKE', `%${options.search}%`)
      })
    }
    // Thêm tổng số ứng dụng trong mỗi danh mục
    query
      .withCount('apps', (builder) => {
        builder.whereNull('deleted_at')
      })
      .as('apps_count')
    return await query.paginate(page, limit)
  }
}
