import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Task } from '../types'

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
  } catch (error) {
    return 'Không xác định'
  }
}

/**
 * Kiểm tra quyền chỉnh sửa task
 */
export const getPermissions = (currentUser: any, task: Task | null) => {
  // Log để debug

  if (!task) {
    return {
      canEdit: false,
      canDelete: false,
      canMarkAsCompleted: false,
      canView: false,
    }
  }

  // Xác định người dùng có phải là superadmin hay không
  const isSuperadmin = checkIsSuperadmin(currentUser)
  // Superadmin luôn có tất cả các quyền
  if (isSuperadmin) {
    return {
      canView: true,
      canEdit: true,
      canDelete: true,
      canMarkAsCompleted: true,
    }
  }
  // Nếu không có thông tin người dùng, chỉ cho phép xem
  if (!currentUser || Object.keys(currentUser).length === 0) {
    return {
      canView: true,
      canEdit: false,
      canDelete: false,
      canMarkAsCompleted: false,
    }
  }

  // Xác định role từ currentUser
  const isAdmin = checkIsAdmin(currentUser)
  // Kiểm tra tổ chức
  const isSameOrganization = Number(currentUser?.organization_id) === Number(task?.organization_id)
  // Kiểm tra người tạo và người được giao
  const isCreator = Number(currentUser?.id) === Number(task?.created_by)
  const isAssignee = Number(currentUser?.id) === Number(task?.assigned_to)
  // Người dùng luôn có thể xem task
  const canView = true
  // Chỉ admin của cùng tổ chức hoặc người tạo/được giao mới có thể chỉnh sửa
  const canEdit = (isAdmin && isSameOrganization) || isCreator || isAssignee
  // Chỉ admin của cùng tổ chức hoặc người tạo mới có thể xóa
  const canDelete = (isAdmin && isSameOrganization) || isCreator
  // Người có quyền chỉnh sửa cũng có thể đánh dấu hoàn thành
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
 * Hỗ trợ nhiều định dạng khác nhau của currentUser
 */
function checkIsSuperadmin(currentUser: any): boolean {
  if (!currentUser) return false
  // Kiểm tra các trường hợp có thể là superadmin
  return (
    // Trường hợp role là chuỗi "superadmin"
    String(currentUser?.role).toLowerCase() === 'superadmin' ||
    // Trường hợp role là đối tượng với thuộc tính name
    (currentUser?.role?.name && String(currentUser.role.name).toLowerCase() === 'superadmin') ||
    // Trường hợp role_id là 1 (thường dùng cho superadmin)
    currentUser?.role_id === 1 ||
    // Trường hợp sử dụng username
    currentUser?.username?.toLowerCase() === 'superadmin'
  )
}

/**
 * Kiểm tra người dùng có phải là admin hay không (bao gồm cả superadmin)
 */
function checkIsAdmin(currentUser: any): boolean {
  if (!currentUser) return false
  return (
    // Kiểm tra các trường hợp role admin
    String(currentUser?.role).toLowerCase() === 'admin' ||
    String(currentUser?.role).toLowerCase() === 'superadmin' ||
    // Trường hợp role là đối tượng
    (currentUser?.role?.name &&
      ['admin', 'superadmin'].includes(String(currentUser.role.name).toLowerCase())) ||
    // Trường hợp role_id là 1 hoặc 2
    currentUser?.role_id === 1 ||
    currentUser?.role_id === 2 ||
    // Trường hợp sử dụng thuộc tính isAdmin
    currentUser?.isAdmin === true
  )
}
