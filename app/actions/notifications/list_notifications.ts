import type { NotificationRecord } from '#infra/shared/repositories/interfaces'
import RepositoryFactory from '#infra/shared/repositories/repository_factory'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import type { ExecutionContext } from '#types/execution_context'

type ListOptions = {
  page: number
  limit: number
  isRead?: boolean
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

  async handle(options: ListOptions): Promise<PaginatedResponse<NotificationRecord>> {
    const { page, limit, isRead } = options
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    const repo = await RepositoryFactory.getNotificationRepository()
    const { data, total } = await repo.findByUser(userId, {
      page,
      limit,
      isRead,
    })

    return {
      data,
      meta: {
        total,
        per_page: limit,
        current_page: page,
        last_page: Math.max(1, Math.ceil(total / limit)),
        first_page: 1,
        next_page_url: page * limit < total ? `?page=${page + 1}` : null,
        previous_page_url: page > 1 ? `?page=${page - 1}` : null,
      },
    }
  }
}
