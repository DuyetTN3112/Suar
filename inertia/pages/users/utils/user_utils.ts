import type { User } from '../types'

interface AuthUserOrganization {
  organization_id: string
  org_role: string
}

interface AuthUserLike {
  current_organization_id?: string | null
  org_role?: string | null
  system_role?: string | null
  organization_users?: AuthUserOrganization[]
}

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
export const isSuperAdminInCurrentOrg = (authUser: AuthUserLike | null | undefined): boolean => {
  if (!authUser) {
    return false
  }

  const currentOrgId = authUser.current_organization_id

  // Kiểm tra org_role trực tiếp
  if (authUser.org_role === 'org_owner') {
    return true
  }

  // Duyệt qua organization_users
  if (authUser.organization_users && Array.isArray(authUser.organization_users)) {
    for (const orgUser of authUser.organization_users) {
      if (orgUser.organization_id === currentOrgId && orgUser.org_role === 'org_owner') {
        return true
      }
    }
  }

  // Fallback: Superadmin hệ thống
  return authUser.system_role === 'superadmin'
}
