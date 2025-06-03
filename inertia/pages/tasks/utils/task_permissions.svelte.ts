import type { Task } from '../types.svelte'

interface User {
  id?: string
  role?: string
  username?: string
  organization_id?: string
  [key: string]: unknown
}

/**
 * Kiểm tra xem người dùng có quyền xóa task hay không
 */
export function canDeleteTask(task: Task, currentUser: User | null | undefined): boolean {
  if (!currentUser || !currentUser.id) {
    return false
  }

  const userRole = currentUser.role || ''
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

  const creatorId = task.creator_id || (task.creator && task.creator.id)
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
    role?: string
    system_role?: string
    username?: string
  }

  const authUser = (window as { auth?: { user?: AuthUser } }).auth?.user
  if (!authUser) {
    if (import.meta.env.MODE === 'development') {
      console.log('Debug - getRoleFromAuth: No auth user found')
    }
    return ''
  }

  // userRole từ middleware
  if (authUser.userRole) {
    return authUser.userRole
  }

  // system_role (v3 field)
  if (authUser.system_role) {
    return authUser.system_role.toLowerCase()
  }

  // role là string
  if (typeof authUser.role === 'string' && authUser.role) {
    return authUser.role.toLowerCase()
  }

  return ''
}

/**
 * Lấy thông tin người dùng hiện tại cho component props
 */
export function getCurrentUserInfo(): {
  id?: string
  role?: string
  organization_id?: string
} {
  interface AuthUser {
    id?: string
    userRole?: string
    role?: string
    system_role?: string
    organization_id?: string
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

  const creatorId = task.creator_id || (task.creator && task.creator.id)
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

  return dueDate < now && task.status.toLowerCase() !== 'done'
}
