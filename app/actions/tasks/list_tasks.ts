import Task from '#models/task'
import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'

type FilterOptions = {
  page?: number
  limit?: number
  status?: number
  priority?: number
  label?: number
  search?: string
  assigned_to?: string
  parent_task_id?: string
  organization_id?: string
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
export default class ListTasks {
  constructor(protected ctx: HttpContext) {}

  async handle(options: FilterOptions = {}): Promise<PaginatedResponse<Task>> {
    const page = options.page || 1
    const limit = options.limit || 10
    const currentOrganizationId =
      options.organization_id || this.ctx.session.get('current_organization_id')

    if (!currentOrganizationId) {
      throw new Error('Không tìm thấy tổ chức hiện tại, vui lòng chọn tổ chức')
    }

    const taskQuery = Task.query()
      .where('organization_id', currentOrganizationId)
      .whereNull('deleted_at')
      .preload('status')
      .preload('label')
      .preload('priority')
      .preload('assignee', (userQuery) => {
        userQuery.select(['id', 'first_name', 'last_name', 'full_name'])
      })
      .preload('creator', (creatorQuery) => {
        creatorQuery.select(['id', 'first_name', 'last_name', 'full_name'])
      })
    if (options.status) {
      taskQuery.where('status_id', options.status)
    }
    if (options.priority) {
      taskQuery.where('priority_id', options.priority)
    }
    if (options.label) {
      taskQuery.where('label_id', options.label)
    }
    if (options.assigned_to) {
      taskQuery.where('assigned_to', options.assigned_to)
    }
    if (options.parent_task_id) {
      taskQuery.where('parent_task_id', options.parent_task_id)
    } else {
      // Nếu không có parent_task_id, hiển thị các task gốc (không có parent)
      // Nếu muốn hiển thị tất cả, hãy bỏ điều kiện này
      // taskQuery.whereNull('parent_task_id')
    }
    if (options.search) {
      taskQuery.where((searchBuilder) => {
        searchBuilder
          .where('title', 'LIKE', `%${options.search}%`)
          .orWhere('description', 'LIKE', `%${options.search}%`)
          .orWhere('id', 'LIKE', `%${options.search}%`)
      })
    }
    const paginator = await taskQuery.orderBy('due_date', 'asc').paginate(page, limit)
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
