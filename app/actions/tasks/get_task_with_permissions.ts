import Task from '#models/task'
import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import { Exception } from '@adonisjs/core/exceptions'

@inject()
export default class GetTaskWithPermissions {
  constructor(protected ctx: HttpContext) {}

  async handle({ id }: { id: number }) {
    const user = this.ctx.auth.user
    // Khởi tạo query cơ bản
    const taskQuery = Task.query()
      .where('id', id)
      .whereNull('deleted_at')
      .preload('status')
      .preload('label')
      .preload('priority')
      .preload('assignee', (query) => {
        query.select(['id', 'first_name', 'last_name', 'full_name'])
      })
      .preload('creator', (query) => {
        query.select(['id', 'first_name', 'last_name', 'full_name'])
      })
      .preload('parentTask', (query) => {
        query.select(['id', 'title'])
      })
      .preload('childTasks', (query) => {
        query.whereNull('deleted_at')
        query.select(['id', 'title', 'status_id', 'parent_task_id'])
        query.preload('status')
      })
      // Tạm thời bỏ phần comments cho đến khi có model
      //.preload('comments', (query) => {
      //  query.preload('user', (userQuery) => {
      //    userQuery.select(['id', 'first_name', 'last_name', 'full_name'])
      //  })
      //  query.orderBy('created_at', 'asc')
      //})
      .preload('versions', (query) => {
        query.orderBy('changed_at', 'desc')
      })
    // Áp dụng logic phân quyền:
    // 1. Nếu là admin hoặc superadmin, có thể xem tất cả task
    // 2. Nếu là user thường, chỉ xem được task được gán cho mình
    if (user) {
      const isAdmin = user.isAdmin || [1, 2].includes(user.role_id)
      // Nếu không phải admin, thêm điều kiện chỉ xem task được gán cho mình
      if (!isAdmin) {
        taskQuery.where('assigned_to', user.id)
      }
    } else {
      // Người dùng chưa đăng nhập không thể xem task
      throw new Exception('Bạn cần đăng nhập để xem task', { status: 401 })
    }
    const task = await taskQuery.firstOrFail()
    return task
  }
}
