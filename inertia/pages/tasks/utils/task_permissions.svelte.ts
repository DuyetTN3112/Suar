import type { Task } from '../types.svelte'

interface User {
  id?: number | string
  role?: string
  role_id?: number
  username?: string
  organization_id?: number | string
  [key: string]: unknown
}

/**
 * Kiểm tra xem người dùng có quyền xóa task hay không
 */
export function canDeleteTask(task: Task, currentUser: User | null | undefined): boolean {
  // Không có thông tin người dùng
  if (!currentUser || !currentUser.id) {
    return false
  }

  // Kiểm tra xem người dùng là superadmin không
  const userRole = currentUser.role || ''
  const isSuperAdmin = userRole === 'superadmin'

  // Superadmin luôn có quyền xóa task
  if (isSuperAdmin) {
    return true
  }

  // Kiểm tra task và tổ chức
  const taskOrgId = task.organization_id
  const userOrgId = currentUser.organization_id

  // Kiểm tra nếu không cùng tổ chức
  if (taskOrgId && userOrgId && taskOrgId !== userOrgId) {
    return false
  }

  // Là admin trong cùng tổ chức
  if (userRole === 'admin') {
    return true
  }

  // Là người tạo task
  const creatorId = task.created_by || (task.creator && task.creator.id)
  const isCreator = Boolean(creatorId && creatorId === currentUser.id)

  if (isCreator) {
    return true
  }

  return false
}

/**
 * Lấy thông tin role từ đối tượng auth
 */
export function getRoleFromAuth(): string {
  interface AuthUser {
    userRole?: string
    role?: string | { id?: number; name?: string }
    username?: string
    role_id?: number
  }

  const authUser = (window as { auth?: { user?: AuthUser } }).auth?.user
  if (!authUser) {
    if (import.meta.env.MODE === 'development') {
      console.log('Debug - getRoleFromAuth: No auth user found')
    }
    return ''
  }

  // Kiểm tra userRole từ middleware
  if (authUser.userRole) {
    return authUser.userRole
  }

  // Trường hợp role là string
  if (typeof authUser.role === 'string') {
    return authUser.role.toLowerCase()
  }

  // Trường hợp role là object
  if (typeof authUser.role === 'object' && authUser.role !== null) {
    // Trường hợp có role.name
    if (authUser.role.name) {
      return authUser.role.name.toLowerCase()
    }

    // Trường hợp có role.id
    if (authUser.role.id === 1) {
      return 'superadmin'
    }
    if (authUser.role.id === 2) {
      return 'admin'
    }
  }

  // Kiểm tra username
  if (authUser.username === 'superadmin') {
    return 'superadmin'
  }

  if (authUser.username === 'admin') {
    return 'admin'
  }

  // Kiểm tra cả role_id của user
  if (authUser.role_id === 1) {
    return 'superadmin'
  }

  if (authUser.role_id === 2) {
    return 'admin'
  }

  return ''
}

/**
 * Lấy thông tin người dùng hiện tại cho component props
 */
export function getCurrentUserInfo(): {
  id?: string | number
  role?: string
  organization_id?: string | number
} {
  interface AuthUser {
    id?: number | string
    userRole?: string
    role?: string | { id?: number; name?: string }
    username?: string
    role_id?: number
    organization_id?: number | string
  }

  const authUser = (window as { auth?: { user?: AuthUser } }).auth?.user
  if (!authUser) {
    return {}
  }

  return {
    id: authUser.id,
    role: getRoleFromAuth(),
    organization_id: authUser.organization_id,
  }
}

/**
 * Kiểm tra xem người dùng có quyền chỉnh sửa task hay không
 */
export function canEditTask(task: Task, currentUser: User | null | undefined): boolean {
  if (!currentUser || !currentUser.id) {
    return false
  }

  const userRole = getRoleFromAuth()
  const isSuperAdmin = userRole === 'superadmin'

  if (isSuperAdmin) {
    return true
  }

  const taskOrgId = task.organization_id
  const userOrgId = currentUser.organization_id

  if (taskOrgId && userOrgId && taskOrgId !== userOrgId) {
    return false
  }

  if (userRole === 'admin') {
    return true
  }

  const creatorId = task.created_by || (task.creator && task.creator.id)
  const isCreator = Boolean(creatorId && creatorId === currentUser.id)

  const assigneeId = task.assigned_to || (task.assignee && task.assignee.id)
  const isAssignee = Boolean(assigneeId && assigneeId === currentUser.id)

  return isCreator || isAssignee
}

/**
 * Kiểm tra xem task có quá hạn hay không
 */
export function isTaskOverdue(task: Task): boolean {
  if (!task.due_date) return false

  const dueDate = new Date(task.due_date)
  const now = new Date()

  return dueDate < now && task.status.name.toLowerCase() !== 'completed'
}
