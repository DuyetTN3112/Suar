/**
 * Các hàm hỗ trợ cho chức năng list tasks
 */
import { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { AuthUser } from './list_tasks_types.js'
import Task from '#models/task'

/**
 * Kiểm tra quyền của người dùng trong tổ chức
 */
export async function checkUserPermissions(ctx: HttpContext, organizationId: string | number) {
  const user = ctx.auth.user as AuthUser | null
  if (!user) {
    return { isAdmin: false, organizationRole: null }
  }
  await user.load('role')
  const isAdmin = ['admin', 'superadmin'].includes(user.role?.name?.toLowerCase() || '')
  const organizationUserQuery = await db
    .from('organization_users')
    .where('organization_id', organizationId)
    .where('user_id', user.id)
    .first()

  return {
    isAdmin,
    organizationRole: organizationUserQuery?.role_id,
  }
}

/**
 * Tạo truy vấn cơ bản cho task
 */
export function createBaseTaskQuery(organizationId: string | number) {
  return Task.query().where('organization_id', organizationId).whereNull('deleted_at')
}

/**
 * Áp dụng các bộ lọc vào truy vấn
 */
export function applyTaskFilters(query: any, options: Record<string, any>) {
  if (options.status) {
    query.where('status_id', options.status)
  }
  if (options.priority) {
    query.where('priority_id', options.priority)
  }
  if (options.label) {
    query.where('label_id', options.label)
  }
  if (options.assigned_to) {
    query.where('assigned_to', options.assigned_to)
  }
  if (options.parent_task_id) {
    query.where('parent_task_id', options.parent_task_id)
  }
  if (options.search) {
    query.where((searchBuilder: any) => {
      searchBuilder
        .where('title', 'LIKE', `%${options.search}%`)
        .orWhere('description', 'LIKE', `%${options.search}%`)
        .orWhere('id', 'LIKE', `%${options.search}%`)
    })
  }
  return query
}

/**
 * Áp dụng các mối quan hệ vào truy vấn
 */
export function applyTaskRelations(query: any) {
  return query
    .preload('status')
    .preload('label')
    .preload('priority')
    .preload('organization')
    .preload('assignee', (q: any) => {
      q.select(['id', 'first_name', 'last_name', 'full_name', 'email'])
    })
    .preload('creator', (q: any) => {
      q.select(['id', 'first_name', 'last_name', 'full_name'])
    })
    .preload('parentTask', (q: any) => {
      q.select(['id', 'title', 'status_id']).preload('status')
    })
    .preload('childTasks', (q: any) => {
      q.whereNull('deleted_at')
        .preload('status')
        .preload('assignee', (userQuery: any) => {
          userQuery.select(['id', 'first_name', 'last_name', 'full_name', 'email'])
        })
    })
}
