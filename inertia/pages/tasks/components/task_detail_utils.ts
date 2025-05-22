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
  if (!task || !currentUser) {
    return {
      canEdit: false,
      canDelete: false,
      canMarkAsCompleted: false,
      canView: false
    }
  }

  // Xác định role từ currentUser
  const isAdmin = 
    String(currentUser?.role).toLowerCase() === 'admin' ||
    String(currentUser?.role).toLowerCase() === 'superadmin' ||
    (currentUser?.role?.name && 
      ['admin', 'superadmin'].includes(String(currentUser.role.name).toLowerCase())) ||
    currentUser?.role_id === 1 || 
    currentUser?.role_id === 2 ||
    currentUser?.isAdmin === true;
  
  const isSuperadmin = 
    String(currentUser?.role).toLowerCase() === 'superadmin' ||
    (currentUser?.role?.name && 
      String(currentUser.role.name).toLowerCase() === 'superadmin') ||
    currentUser?.role_id === 1;
  
  // Kiểm tra tổ chức
  const isSameOrganization = 
    Number(currentUser?.organization_id) === Number(task?.organization_id);
  
  // Kiểm tra người tạo và người được giao
  const isCreator = Number(currentUser?.id) === Number(task?.created_by);
  const isAssignee = Number(currentUser?.id) === Number(task?.assigned_to);
  
  // Người dùng luôn có thể xem task
  const canView = true;
  
  // Chỉ admin/superadmin của cùng tổ chức hoặc người tạo/được giao mới có thể chỉnh sửa
  const canEdit = 
    (isAdmin && isSameOrganization) || 
    isCreator || 
    isAssignee || 
    isSuperadmin;
  
  // Chỉ admin/superadmin của cùng tổ chức hoặc người tạo mới có thể xóa
  const canDelete = 
    (isAdmin && isSameOrganization) || 
    isCreator || 
    isSuperadmin;
  
  // Người có quyền chỉnh sửa cũng có thể đánh dấu hoàn thành
  const canMarkAsCompleted = canEdit;

  return {
    canView,
    canEdit,
    canDelete,
    canMarkAsCompleted,
  }
}
