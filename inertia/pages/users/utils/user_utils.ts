import type { User } from '../types'

/**
 * Lấy tên hiển thị của người dùng
 */
export const getUserDisplayName = (user: User): string => {
  return user.username || user.email || 'Unknown'
}

/**
 * Lấy vai trò của người dùng trong tổ chức hiện tại
 */
export const getUserOrganizationRole = (user: User): string => {
  // Lấy vai trò từ organization_users
  // Backend đã lọc users theo tổ chức hiện tại, vì vậy ta chỉ cần kiểm tra organization_users[0]
  if (user.organization_users && user.organization_users.length > 0) {
    // Lấy thông tin role từ phần tử đầu tiên
    const orgUser = user.organization_users[0]

    // Nếu có thông tin role được load
    if (orgUser.role && orgUser.role.name) {
      return orgUser.role.name
    }
    // Nếu không có name thì dùng id để xác định vai trò
    const roleId = Number(orgUser.role_id)
    switch (roleId) {
      case 1:
        return 'Superadmin'
      case 2:
        return 'Admin'
      case 3:
        return 'User'
      default:
        return 'Không xác định'
    }
  }
  // Nếu không có thông tin organization_users
  return 'Không có vai trò'
}

/**
 * Kiểm tra người dùng hiện tại có phải là superadmin của tổ chức không
 */
export const isSuperAdminInCurrentOrg = (authUser: unknown): boolean => {
  const user = authUser
  const currentOrgId = user.current_organization_id

  // PHƯƠNG PHÁP 1: Kiểm tra organization_role
  if (user.organization_role && user.organization_role.id === 1) {
    return true
  }

  // PHƯƠNG PHÁP 2: Duyệt qua organization_users
  if (user.organization_users && Array.isArray(user.organization_users)) {
    for (const orgUser of user.organization_users) {
      if (
        Number(orgUser.organization_id) === Number(currentOrgId) &&
        Number(orgUser.role_id) === 1
      ) {
        return true
      }
    }
  }
  // PHƯƠNG PHÁP 3: Xác định qua $extras từ backend nếu có
  if (user.$extras && user.$extras.organization_role && user.$extras.organization_role.id === 1) {
    return true
  }
  // Fallback: Superadmin hệ thống
  return Number(user.role?.id) === 1
}
