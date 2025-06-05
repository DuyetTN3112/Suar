import type Notification from '#models/notification'
import LucidNotificationRepository from '#repositories/lucid_notification_repository'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import type { ExecutionContext } from '#types/execution_context'

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

export default class ListNotifications {
  constructor(protected execCtx: ExecutionContext) {}

  async handle(options: ListOptions): Promise<PaginatedResponse<Notification>> {
    const { page, limit, isRead, type } = options
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    // Delegate to Model static method
    const paginator = await LucidNotificationRepository.paginateByUser(userId, {
      page,
      limit,
      isRead,
      type,
    })

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
