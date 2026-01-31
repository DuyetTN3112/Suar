/**
 * Project Constants
 *
 * Constants liên quan đến Project, ProjectMember, ProjectRole.
 * Pattern học từ ancarat-bo: enum + options array + helper function
 *
 * @module ProjectConstants
 */

/**
 * Project Role IDs
 * Hierarchy: Owner > Manager > Member > Viewer
 */
export enum ProjectRole {
  OWNER = 1,
  MANAGER = 2,
  MEMBER = 3,
  VIEWER = 4,
}

export const projectRoleOptions = [
  {
    label: 'Owner',
    labelVi: 'Chủ dự án',
    value: ProjectRole.OWNER,
    description: 'Toàn quyền quản lý dự án',
    style: 'bg-purple-100 text-purple-800 border-purple-200',
    color: '#9333ea',
  },
  {
    label: 'Manager',
    labelVi: 'Quản lý',
    value: ProjectRole.MANAGER,
    description: 'Quản lý task và thành viên dự án',
    style: 'bg-blue-100 text-blue-800 border-blue-200',
    color: '#3b82f6',
  },
  {
    label: 'Member',
    labelVi: 'Thành viên',
    value: ProjectRole.MEMBER,
    description: 'Thực hiện task được giao',
    style: 'bg-green-100 text-green-800 border-green-200',
    color: '#22c55e',
  },
  {
    label: 'Viewer',
    labelVi: 'Người xem',
    value: ProjectRole.VIEWER,
    description: 'Chỉ có quyền xem',
    style: 'bg-gray-100 text-gray-800 border-gray-200',
    color: '#6b7280',
  },
]

/**
 * Lấy tên role theo ID
 */
export function getProjectRoleName(roleId: ProjectRole): string {
  return projectRoleOptions.find((option) => option.value === roleId)?.label ?? 'Unknown'
}

/**
 * Lấy tên role tiếng Việt theo ID
 */
export function getProjectRoleNameVi(roleId: ProjectRole): string {
  return projectRoleOptions.find((option) => option.value === roleId)?.labelVi ?? 'Không xác định'
}

/**
 * Kiểm tra role có quyền quản lý (Owner hoặc Manager)
 */
export function isProjectManager(roleId: ProjectRole): boolean {
  return roleId === ProjectRole.OWNER || roleId === ProjectRole.MANAGER
}

/**
 * Project Visibility
 * Mức độ hiển thị của dự án
 */
export enum ProjectVisibility {
  PRIVATE = 'private',
  ORGANIZATION = 'organization',
  PUBLIC = 'public',
}

export const projectVisibilityOptions = [
  {
    label: 'Private',
    labelVi: 'Riêng tư',
    value: ProjectVisibility.PRIVATE,
    description: 'Chỉ thành viên dự án mới có thể xem',
    style: 'bg-gray-100 text-gray-800 border-gray-200',
  },
  {
    label: 'Organization',
    labelVi: 'Tổ chức',
    value: ProjectVisibility.ORGANIZATION,
    description: 'Tất cả thành viên tổ chức có thể xem',
    style: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  {
    label: 'Public',
    labelVi: 'Công khai',
    value: ProjectVisibility.PUBLIC,
    description: 'Bất kỳ ai cũng có thể xem',
    style: 'bg-green-100 text-green-800 border-green-200',
  },
]

export function getProjectVisibilityLabel(visibility: ProjectVisibility): string {
  return projectVisibilityOptions.find((option) => option.value === visibility)?.label ?? 'Unknown'
}

/**
 * Project Member Status
 * Trạng thái thành viên trong dự án
 */
export enum ProjectMemberStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
}

export const projectMemberStatusOptions = [
  {
    label: 'Active',
    labelVi: 'Đang hoạt động',
    value: ProjectMemberStatus.ACTIVE,
    style: 'bg-green-100 text-green-800 border-green-200',
  },
  {
    label: 'Inactive',
    labelVi: 'Không hoạt động',
    value: ProjectMemberStatus.INACTIVE,
    style: 'bg-gray-100 text-gray-800 border-gray-200',
  },
  {
    label: 'Pending',
    labelVi: 'Chờ xác nhận',
    value: ProjectMemberStatus.PENDING,
    style: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
]
