import Task from '#models/task'

/**
 * Kiểm tra quyền hạn người dùng
 */
export async function checkUserPermissions(ctx, organizationId) {
  const user = ctx.auth.user
  let isAdmin = false
  let organizationRole = null

  // Nếu vai trò người dùng là 'admin' hoặc 'superadmin', họ là admin hệ thống
  if (user.role?.name?.toLowerCase() === 'admin' || user.role?.name?.toLowerCase() === 'superadmin') {
    isAdmin = true
  }

  // Kiểm tra vai trò trong tổ chức
  try {
    // Load mối quan hệ organization_users nếu chưa được load
    if (!user.$preloaded.organization_users) {
      await user.load('organization_users')
    }

    // Tìm và lấy vai trò trong tổ chức hiện tại
    const userInOrg = user.organization_users?.find(
      (ou) => String(ou.organization_id) === String(organizationId)
    )

    organizationRole = userInOrg?.role_id
    console.log('[checkUserPermissions] User organization role:', organizationRole)
  } catch (error) {
    console.error('[checkUserPermissions] Error checking organization role:', error)
  }

  return {
    isAdmin,
    organizationRole,
  }
}

/**
 * Tạo truy vấn cơ sở cho danh sách task
 */
export function createBaseTaskQuery(organizationId) {
  return Task.query()
    .where('organization_id', organizationId)
    .orderBy('created_at', 'desc')
}

/**
 * Áp dụng các bộ lọc cho truy vấn task
 */
export function applyTaskFilters(taskQuery, options) {
  // Lọc theo trạng thái
  if (options.status) {
    taskQuery.where('status_id', options.status)
  }

  // Lọc theo độ ưu tiên
  if (options.priority) {
    taskQuery.where('priority_id', options.priority)
  }

  // Lọc theo nhãn
  if (options.label) {
    taskQuery.where('label_id', options.label)
  }

  // Lọc theo người được gán
  if (options.assigned_to) {
    taskQuery.where('assigned_to', options.assigned_to)
  }

  // Lọc theo task cha
  if (options.parent_task_id) {
    taskQuery.where('parent_task_id', options.parent_task_id)
  } else {
    // Mặc định chỉ lấy các task gốc (parent tasks)
    // taskQuery.whereNull('parent_task_id')
  }

  // Tìm kiếm theo từ khóa
  if (options.search) {
    const searchTerm = `%${options.search}%`
    taskQuery.where((query) => {
      query
        .where('title', 'LIKE', searchTerm)
        .orWhere('description', 'LIKE', searchTerm)
    })
  }
}

/**
 * Áp dụng các mối quan hệ cần load cho task
 */
export function applyTaskRelations(taskQuery) {
  taskQuery.preload('status')
  taskQuery.preload('priority')
  taskQuery.preload('label')
  taskQuery.preload('assignee', (query) => {
    query.select('id', 'first_name', 'last_name', 'full_name')
  })
  taskQuery.preload('creator', (query) => {
    query.select('id', 'first_name', 'last_name', 'full_name')
  })
  
  // Preload task con
  taskQuery.preload('childTasks', (childQuery) => {
    childQuery.preload('status')
    childQuery.preload('priority')
    childQuery.preload('label')
    childQuery.preload('assignee', (query) => {
      query.select('id', 'first_name', 'last_name', 'full_name')
    })
  })
} 