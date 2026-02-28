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
  if (user.organization_users && user.organization_users.length > 0) {
    const orgUser = user.organization_users[0]
    const orgRole = orgUser.org_role

    switch (orgRole) {
      case 'org_owner':
        return 'Owner'
      case 'org_admin':
        return 'Admin'
      case 'org_member':
        return 'Member'
      default:
        return orgRole || 'Không xác định'
    }
  }
  return 'Không có vai trò'
}

/**
 * Kiểm tra người dùng hiện tại có phải là owner/admin của tổ chức không
 */
export const isSuperAdminInCurrentOrg = (authUser: unknown): boolean => {
  const user = authUser as any
  const currentOrgId = user.current_organization_id

  // Kiểm tra org_role trực tiếp
  if (user.org_role === 'org_owner') {
    return true
  }

  // Duyệt qua organization_users
  if (user.organization_users && Array.isArray(user.organization_users)) {
    for (const orgUser of user.organization_users) {
      if (
        String(orgUser.organization_id) === String(currentOrgId) &&
        orgUser.org_role === 'org_owner'
      ) {
        return true
      }
    }
  }

  // Fallback: Superadmin hệ thống
  return user.system_role === 'superadmin'
}
