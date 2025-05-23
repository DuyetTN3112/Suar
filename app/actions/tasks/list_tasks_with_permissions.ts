import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import Task from '#models/task'
import { FilterOptions, PaginatedResponse, TaskPaginator } from './list_tasks_types.js'
import {
  checkUserPermissions,
  createBaseTaskQuery,
  applyTaskFilters,
  applyTaskRelations,
} from './list_tasks_helpers.js'

@inject()
export default class ListTasksWithPermissions {
  constructor(protected ctx: HttpContext) {}

  async handle(options: FilterOptions = {}): Promise<PaginatedResponse<Task>> {
    const page = options.page || 1
    const limit = options.limit || 10

    // Lấy user hiện tại từ context
    const user = this.ctx.auth.user
    console.log('[ListTasksWithPermissions] User:', user?.id, 'Name:', user?.full_name)

    // Nếu không có người dùng đăng nhập, trả về danh sách trống
    if (!user) {
      console.log('[ListTasksWithPermissions] No authenticated user found')
      return this.getEmptyResponse(limit, page)
    }

    // Lấy tổ chức hiện tại từ session hoặc tham số
    const currentOrganizationId =
      options.organization_id || this.ctx.session.get('current_organization_id')

    console.log('[ListTasksWithPermissions] Current Organization ID:', currentOrganizationId)
    if (!currentOrganizationId) {
      console.log('[ListTasksWithPermissions] No current organization found')
      // Không ném ngoại lệ, thay vào đó đánh dấu session để hiển thị modal
      this.ctx.session.put('show_organization_required_modal', true)
      await this.ctx.session.commit()
      // Trả về danh sách trống với thông báo
      return {
        ...this.getEmptyResponse(limit, page),
        message: 'Cần chọn hoặc tham gia một tổ chức để xem danh sách công việc',
      }
    }

    // Truy vấn cơ bản
    const taskQuery = createBaseTaskQuery(currentOrganizationId)

    // Kiểm tra quyền và vai trò người dùng
    const { isAdmin, organizationRole } = await checkUserPermissions(
      this.ctx,
      currentOrganizationId
    )

    console.log('[ListTasksWithPermissions] User role data:', { isAdmin, organizationRole })

    // Áp dụng giới hạn theo quyền người dùng
    if (!isAdmin) {
      const userHasOrgAdminRole = organizationRole === 1 || organizationRole === 2

      if (!userHasOrgAdminRole) {
        console.log('[ListTasksWithPermissions] Regular user, filtering tasks')
        // Người dùng thường chỉ xem được task của mình
        taskQuery.where((query) => {
          query.where('creator_id', user.id).orWhere('assigned_to', user.id)
        })
      }
    }

    // Debug SQL query
    console.log('[ListTasksWithPermissions] SQL Query:', taskQuery.toSQL().sql)
    // Áp dụng các bộ lọc
    applyTaskFilters(taskQuery, options)

    // Áp dụng các mối quan hệ
    applyTaskRelations(taskQuery)

    // Thực hiện phân trang
    const paginator = (await taskQuery
      .orderBy('due_date', 'asc')
      .paginate(page, limit)) as TaskPaginator
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

  private getEmptyResponse(limit: number, page: number): PaginatedResponse<Task> {
    return {
      data: [],
      meta: {
        total: 0,
        per_page: limit,
        current_page: page,
        last_page: 0,
        first_page: 1,
        next_page_url: null,
        previous_page_url: null,
      },
    }
  }
}
