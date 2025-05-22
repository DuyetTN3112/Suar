import Notification from '#models/notification'
import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'

type ListOptions = {
  page: number
  limit: number
  isRead?: boolean
  type?: string
}

type PaginatedResponse<T> = {
  data: T[]
  meta: {
    total: number
    per_page: number
    current_page: number
    last_page: number
    first_page: number
    next_page_url: string | null
    previous_page_url: string | null
  }
}

@inject()
export default class ListNotifications {
  constructor(protected ctx: HttpContext) {}

  async handle(options: ListOptions): Promise<PaginatedResponse<Notification>> {
    const { page, limit, isRead, type } = options
    const user = this.ctx.auth.user!

    const query = Notification.query().where('user_id', user.id).orderBy('created_at', 'desc')

    if (isRead !== undefined) {
      query.where('is_read', isRead)
    }

    if (type) {
      query.where('type', type)
    }

    const paginator = await query.paginate(page, limit)
    // Chuyển đổi kết quả phân trang vào format tương thích
    return {
      data: paginator.all(),
      meta: {
        total: paginator.total,
        per_page: paginator.perPage,
        current_page: paginator.currentPage,
        last_page: paginator.lastPage,
        first_page: paginator.firstPage,
        next_page_url: paginator.getNextPageUrl() || null,
        previous_page_url: paginator.getPreviousPageUrl() || null,
      },
    }
  }
}
