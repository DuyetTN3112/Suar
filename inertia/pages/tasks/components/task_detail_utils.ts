import { format } from 'date-fns'
import { vi } from 'date-fns/locale'

import type { Task } from '../types.svelte'

/**
 * Tạo initials từ tên người dùng
 */
export const getAvatarInitials = (name: string | undefined): string => {
  if (!name) return 'U'
  const parts = name.split(' ')
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

/**
 * Format ngày tháng theo định dạng ngày/tháng/năm giờ:phút
 */
export const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString)
    return format(date, 'dd/MM/yyyy HH:mm', { locale: vi })
  } catch {
    return 'Không xác định'
  }
}

interface CurrentUser {
  id?: string
  role?: string
  system_role?: string
  organization_id?: string
  isAdmin?: boolean
  [key: string]: unknown
}

/**
 * Kiểm tra quyền chỉnh sửa task
 */
export const getPermissions = (currentUser: CurrentUser | null | undefined, task: Task | null) => {
  if (!task) {
    return {
      canEdit: false,
      canDelete: false,
      canMarkAsCompleted: false,
      canView: false,
    }
  }

  const isSuperadmin = checkIsSuperadmin(currentUser)
  if (isSuperadmin) {
    return {
      canView: true,
      canEdit: true,
      canDelete: true,
      canMarkAsCompleted: true,
    }
  }

  if (!currentUser || Object.keys(currentUser).length === 0) {
    return {
      canView: true,
      canEdit: false,
      canDelete: false,
      canMarkAsCompleted: false,
    }
  }

  const isAdmin = checkIsAdmin(currentUser)
  const isSameOrganization = currentUser.organization_id === task.organization_id
  const isCreator = Boolean(currentUser.id && currentUser.id === task.creator_id)
  const isAssignee = Boolean(currentUser.id && currentUser.id === task.assigned_to)

  const canView = true
  const canEdit = (isAdmin && isSameOrganization) || isCreator || isAssignee
  const canDelete = (isAdmin && isSameOrganization) || isCreator
  const canMarkAsCompleted = canEdit

  return {
    canView,
    canEdit,
    canDelete,
    canMarkAsCompleted,
  }
}

/**
 * Kiểm tra người dùng có phải là superadmin hay không
 */
function checkIsSuperadmin(currentUser: CurrentUser | null | undefined): boolean {
  if (!currentUser) return false
  const role = (currentUser.role ?? currentUser.system_role) ?? ''
  return role.toLowerCase() === 'superadmin'
}

/**
 * Kiểm tra người dùng có phải là admin hay không (bao gồm cả superadmin)
 */
function checkIsAdmin(currentUser: CurrentUser | null | undefined): boolean {
  if (!currentUser) return false
  const role = ((currentUser.role ?? currentUser.system_role) ?? '').toLowerCase()
  return role === 'admin' || role === 'superadmin' || currentUser.isAdmin === true
}
