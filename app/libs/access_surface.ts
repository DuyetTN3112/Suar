import {
  ORG_ROLE_PERMISSIONS,
  PROJECT_ROLE_PERMISSIONS,
  SYSTEM_ROLE_PERMISSIONS,
} from '#constants/permissions'
import { OrganizationRole } from '#constants/organization_constants'
import { ProjectRole } from '#constants/project_constants'
import { SystemRoleName } from '#constants/user_constants'
import type { CustomRoleDefinition } from '#types/database'

export interface PermissionPresentation {
  key: string
  label: string
  description: string
  category: string
}

const PERMISSION_PRESENTATION_MAP: Record<
  string,
  { label: string; description: string; category: string }
> = {
  '*': {
    label: 'Toàn quyền',
    description: 'Truy cập và thao tác không giới hạn trong phạm vi hệ thống.',
    category: 'System',
  },
  'can_manage_users': {
    label: 'Quản lý người dùng',
    description: 'Xem, đổi vai trò, khóa hoặc khôi phục tài khoản người dùng.',
    category: 'Administration',
  },
  'can_view_all_organizations': {
    label: 'Xem toàn bộ tổ chức',
    description: 'Truy cập danh sách và chi tiết mọi organization trong hệ thống.',
    category: 'Administration',
  },
  'can_view_system_logs': {
    label: 'Xem nhật ký hệ thống',
    description: 'Theo dõi audit logs, vận hành và thay đổi quan trọng của hệ thống.',
    category: 'Monitoring',
  },
  'can_view_reports': {
    label: 'Xem báo cáo hệ thống',
    description: 'Mở các dashboard và báo cáo phân tích cấp hệ thống.',
    category: 'Monitoring',
  },
  'can_manage_system_settings': {
    label: 'Quản lý cấu hình hệ thống',
    description: 'Cập nhật cài đặt vận hành cấp hệ thống.',
    category: 'Administration',
  },
  'can_create_project': {
    label: 'Tạo dự án',
    description: 'Khởi tạo project mới trong organization.',
    category: 'Project',
  },
  'can_manage_members': {
    label: 'Quản lý thành viên',
    description: 'Thêm, gỡ, sắp xếp vai trò và điều phối nhân sự.',
    category: 'Membership',
  },
  'can_delete_organization': {
    label: 'Xóa tổ chức',
    description: 'Thực hiện thao tác xóa organization.',
    category: 'Governance',
  },
  'can_view_all_projects': {
    label: 'Xem tất cả dự án',
    description: 'Truy cập toàn bộ project thuộc organization.',
    category: 'Project',
  },
  'can_transfer_ownership': {
    label: 'Chuyển quyền sở hữu',
    description: 'Chuyển ownership cho role hoặc thành viên phù hợp.',
    category: 'Governance',
  },
  'can_manage_settings': {
    label: 'Quản lý cài đặt',
    description: 'Cập nhật thông tin, workflow và cấu hình của organization.',
    category: 'Governance',
  },
  'can_create_custom_roles': {
    label: 'Tạo vai trò tùy chỉnh',
    description: 'Khai báo role mới dựa trên tập quyền của organization.',
    category: 'Governance',
  },
  'can_invite_members': {
    label: 'Mời thành viên',
    description: 'Tạo lời mời hoặc đưa người dùng mới vào organization.',
    category: 'Membership',
  },
  'can_approve_members': {
    label: 'Duyệt tham gia',
    description: 'Xử lý yêu cầu vào organization.',
    category: 'Membership',
  },
  'can_remove_members': {
    label: 'Gỡ thành viên',
    description: 'Loại thành viên khỏi organization.',
    category: 'Membership',
  },
  'can_view_audit_logs': {
    label: 'Xem audit log',
    description: 'Theo dõi thay đổi và hoạt động quan trọng của tổ chức.',
    category: 'Monitoring',
  },
  'can_manage_integrations': {
    label: 'Quản lý tích hợp',
    description: 'Điều phối các kết nối và tích hợp ngoài hệ thống.',
    category: 'Integrations',
  },
  'can_view_assigned_projects': {
    label: 'Xem dự án được giao',
    description: 'Chỉ truy cập các project có liên quan trực tiếp.',
    category: 'Project',
  },
  'can_update_own_tasks': {
    label: 'Cập nhật task của mình',
    description: 'Sửa trạng thái và thông tin task được giao trực tiếp.',
    category: 'Task',
  },
  'can_view_organization_info': {
    label: 'Xem thông tin tổ chức',
    description: 'Đọc thông tin cơ bản và cấu trúc chung của organization.',
    category: 'Organization',
  },
  'can_comment_on_tasks': {
    label: 'Bình luận task',
    description: 'Tham gia trao đổi và cập nhật ngữ cảnh trong task.',
    category: 'Collaboration',
  },
  'can_upload_task_files': {
    label: 'Tải file cho task',
    description: 'Đính kèm file phục vụ trao đổi hoặc nghiệm thu task.',
    category: 'Collaboration',
  },
  'can_delete_project': {
    label: 'Xóa dự án',
    description: 'Xóa project khỏi hệ thống.',
    category: 'Project',
  },
  'can_create_task': {
    label: 'Tạo task',
    description: 'Khởi tạo task mới trong project.',
    category: 'Task',
  },
  'can_assign_task': {
    label: 'Giao task',
    description: 'Gán task cho thành viên hoặc freelancer.',
    category: 'Task',
  },
  'can_update_any_task': {
    label: 'Cập nhật mọi task',
    description: 'Chỉnh sửa toàn bộ task trong project.',
    category: 'Task',
  },
  'can_delete_any_task': {
    label: 'Xóa mọi task',
    description: 'Xóa task bất kỳ trong project.',
    category: 'Task',
  },
  'can_invite_freelancer': {
    label: 'Mời freelancer',
    description: 'Đưa freelancer hoặc ứng viên ngoài tổ chức vào flow công việc.',
    category: 'Marketplace',
  },
  'can_approve_application': {
    label: 'Duyệt đơn ứng tuyển',
    description: 'Xử lý application trên marketplace hoặc task external.',
    category: 'Marketplace',
  },
  'can_manage_project_settings': {
    label: 'Quản lý cài đặt dự án',
    description: 'Sửa cấu hình và quy ước của project.',
    category: 'Project',
  },
  'can_view_all_tasks': {
    label: 'Xem toàn bộ task',
    description: 'Truy cập tất cả task trong project.',
    category: 'Task',
  },
  'can_manage_project_budget': {
    label: 'Quản lý ngân sách dự án',
    description: 'Theo dõi và điều chỉnh budget của project.',
    category: 'Project',
  },
  'can_export_project_data': {
    label: 'Xuất dữ liệu dự án',
    description: 'Trích xuất dữ liệu project cho báo cáo hoặc đối soát.',
    category: 'Reporting',
  },
  'can_update_task': {
    label: 'Cập nhật task',
    description: 'Cập nhật task trong phạm vi quản lý của mình.',
    category: 'Task',
  },
  'can_delete_task': {
    label: 'Xóa task',
    description: 'Xóa task trong phạm vi quản lý của mình.',
    category: 'Task',
  },
  'can_review_completed_tasks': {
    label: 'Review task hoàn tất',
    description: 'Theo dõi và chấm chất lượng công việc đã hoàn thành.',
    category: 'Review',
  },
  'can_manage_task_priorities': {
    label: 'Quản lý độ ưu tiên task',
    description: 'Sắp xếp mức ưu tiên và thứ tự xử lý task.',
    category: 'Task',
  },
  'can_view_project_reports': {
    label: 'Xem báo cáo dự án',
    description: 'Truy cập biểu đồ và số liệu của project.',
    category: 'Reporting',
  },
  'can_view_assigned_tasks': {
    label: 'Xem task được giao',
    description: 'Chỉ xem các task được giao trực tiếp.',
    category: 'Task',
  },
}

const BUILT_IN_ROLE_LABELS: Record<string, string> = {
  [SystemRoleName.SUPERADMIN]: 'Superadmin',
  [SystemRoleName.SYSTEM_ADMIN]: 'System Admin',
  [SystemRoleName.REGISTERED_USER]: 'Registered User',
  [OrganizationRole.OWNER]: 'Owner Org',
  [OrganizationRole.ADMIN]: 'Org Admin',
  [OrganizationRole.MEMBER]: 'Org Member',
  [ProjectRole.OWNER]: 'Project Owner',
  [ProjectRole.MANAGER]: 'Project Manager',
  [ProjectRole.MEMBER]: 'Project Member',
  [ProjectRole.VIEWER]: 'Project Viewer',
}

const BUILT_IN_ROLE_DESCRIPTIONS: Record<string, string> = {
  [SystemRoleName.SUPERADMIN]: 'Toàn quyền cấp hệ thống.',
  [SystemRoleName.SYSTEM_ADMIN]: 'Điều hành vận hành hệ thống, moderation và báo cáo.',
  [SystemRoleName.REGISTERED_USER]: 'Người dùng thông thường, không có quyền hệ thống.',
  [OrganizationRole.OWNER]: 'Chủ tổ chức, có toàn quyền trong phạm vi organization.',
  [OrganizationRole.ADMIN]: 'Quản trị viên tổ chức, điều phối membership và vận hành.',
  [OrganizationRole.MEMBER]: 'Thành viên tham gia dự án và task thường ngày.',
  [ProjectRole.OWNER]: 'Chủ dự án, chịu trách nhiệm project-level governance.',
  [ProjectRole.MANAGER]: 'Quản lý dự án, điều phối task và thành viên.',
  [ProjectRole.MEMBER]: 'Thành viên thực thi trong project.',
  [ProjectRole.VIEWER]: 'Người xem chỉ có quyền theo dõi thông tin.',
}

export function humanizeIdentifier(value: string): string {
  return value
    .replace(/^can_/, '')
    .split(/[_-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

export function formatRoleLabel(role: string): string {
  return BUILT_IN_ROLE_LABELS[role] ?? humanizeIdentifier(role)
}

export function getRoleDescription(role: string): string {
  return BUILT_IN_ROLE_DESCRIPTIONS[role] ?? 'Vai trò tùy chỉnh do organization định nghĩa.'
}

export function describePermission(permission: string): PermissionPresentation {
  const predefined = PERMISSION_PRESENTATION_MAP[permission]
  if (predefined) {
    return { key: permission, ...predefined }
  }

  return {
    key: permission,
    label: humanizeIdentifier(permission),
    description: 'Quyền hạn tùy chỉnh hoặc chưa được gắn mô tả chi tiết.',
    category: 'Custom',
  }
}

export function listKnownOrganizationPermissions(
  customRoles: CustomRoleDefinition[] = []
): PermissionPresentation[] {
  const permissionSet = new Set<string>()

  for (const permissions of Object.values(ORG_ROLE_PERMISSIONS)) {
    for (const permission of permissions) {
      permissionSet.add(permission)
    }
  }

  for (const role of customRoles) {
    for (const permission of role.permissions) {
      permissionSet.add(permission)
    }
  }

  return [...permissionSet]
    .sort((left, right) => left.localeCompare(right))
    .map((permission) => describePermission(permission))
}

export function listSystemPermissionCatalog(): PermissionPresentation[] {
  const permissionSet = new Set<string>()
  for (const permissions of Object.values(SYSTEM_ROLE_PERMISSIONS)) {
    for (const permission of permissions) {
      permissionSet.add(permission)
    }
  }

  return [...permissionSet]
    .sort((left, right) => left.localeCompare(right))
    .map((permission) => describePermission(permission))
}

export function listProjectPermissionCatalog(): PermissionPresentation[] {
  const permissionSet = new Set<string>()
  for (const permissions of Object.values(PROJECT_ROLE_PERMISSIONS)) {
    for (const permission of permissions) {
      permissionSet.add(permission)
    }
  }

  return [...permissionSet]
    .sort((left, right) => left.localeCompare(right))
    .map((permission) => describePermission(permission))
}
