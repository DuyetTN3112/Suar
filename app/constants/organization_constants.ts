/**
 * Organization Constants
 *
 * Constants liên quan đến Organization, OrganizationUser, OrganizationRole.
 * Pattern học từ ancarat-bo: enum + options array + helper function
 *
 * @module OrganizationConstants
 */

/**
 * Organization Role IDs
 * Hierarchy: Owner > Admin > Manager > Member > Viewer
 */
export enum OrganizationRole {
  OWNER = 1,
  ADMIN = 2,
  MANAGER = 3,
  MEMBER = 4,
  VIEWER = 5,
}

export const organizationRoleOptions = [
  {
    label: 'Owner',
    labelVi: 'Chủ sở hữu',
    value: OrganizationRole.OWNER,
    description: 'Toàn quyền quản lý tổ chức',
    style: 'bg-purple-100 text-purple-800 border-purple-200',
    color: '#9333ea',
  },
  {
    label: 'Admin',
    labelVi: 'Quản trị viên',
    value: OrganizationRole.ADMIN,
    description: 'Quản lý thành viên và cài đặt',
    style: 'bg-blue-100 text-blue-800 border-blue-200',
    color: '#3b82f6',
  },
  {
    label: 'Manager',
    labelVi: 'Quản lý',
    value: OrganizationRole.MANAGER,
    description: 'Quản lý dự án và task',
    style: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    color: '#06b6d4',
  },
  {
    label: 'Member',
    labelVi: 'Thành viên',
    value: OrganizationRole.MEMBER,
    description: 'Thực hiện công việc được giao',
    style: 'bg-green-100 text-green-800 border-green-200',
    color: '#22c55e',
  },
  {
    label: 'Viewer',
    labelVi: 'Người xem',
    value: OrganizationRole.VIEWER,
    description: 'Chỉ có quyền xem',
    style: 'bg-gray-100 text-gray-800 border-gray-200',
    color: '#6b7280',
  },
]

/**
 * Lấy tên role theo ID
 */
export function getOrganizationRoleName(roleId: OrganizationRole): string {
  return organizationRoleOptions.find((option) => option.value === roleId)?.label ?? 'Unknown'
}

/**
 * Lấy tên role tiếng Việt theo ID
 */
export function getOrganizationRoleNameVi(roleId: OrganizationRole): string {
  return (
    organizationRoleOptions.find((option) => option.value === roleId)?.labelVi ?? 'Không xác định'
  )
}

/**
 * Kiểm tra role có quyền admin (Owner hoặc Admin)
 */
export function isOrganizationAdmin(roleId: OrganizationRole): boolean {
  return roleId === OrganizationRole.OWNER || roleId === OrganizationRole.ADMIN
}

/**
 * Kiểm tra role có quyền quản lý (Owner, Admin hoặc Manager)
 */
export function isOrganizationManager(roleId: OrganizationRole): boolean {
  return roleId <= OrganizationRole.MANAGER
}

/**
 * Organization User Status
 * Trạng thái thành viên trong tổ chức
 */
export enum OrganizationUserStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export const organizationUserStatusOptions = [
  {
    label: 'Pending',
    labelVi: 'Chờ duyệt',
    value: OrganizationUserStatus.PENDING,
    style: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    color: '#f59e0b',
  },
  {
    label: 'Approved',
    labelVi: 'Đã duyệt',
    value: OrganizationUserStatus.APPROVED,
    style: 'bg-green-100 text-green-800 border-green-200',
    color: '#22c55e',
  },
  {
    label: 'Rejected',
    labelVi: 'Từ chối',
    value: OrganizationUserStatus.REJECTED,
    style: 'bg-red-100 text-red-800 border-red-200',
    color: '#ef4444',
  },
]

/**
 * Lấy tên status theo giá trị
 */
export function getOrganizationUserStatusName(status: OrganizationUserStatus): string {
  return organizationUserStatusOptions.find((option) => option.value === status)?.label ?? 'Unknown'
}

/**
 * Lấy tên status tiếng Việt
 */
export function getOrganizationUserStatusNameVi(status: OrganizationUserStatus): string {
  return (
    organizationUserStatusOptions.find((option) => option.value === status)?.labelVi ??
    'Không xác định'
  )
}

/**
 * Organization Plans
 */
export enum OrganizationPlan {
  FREE = 'free',
  STARTER = 'starter',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
}

export const organizationPlanOptions = [
  {
    label: 'Free',
    labelVi: 'Miễn phí',
    value: OrganizationPlan.FREE,
    maxMembers: 5,
    maxProjects: 3,
  },
  {
    label: 'Starter',
    labelVi: 'Khởi động',
    value: OrganizationPlan.STARTER,
    maxMembers: 20,
    maxProjects: 10,
  },
  {
    label: 'Professional',
    labelVi: 'Chuyên nghiệp',
    value: OrganizationPlan.PROFESSIONAL,
    maxMembers: 100,
    maxProjects: -1, // unlimited
  },
  {
    label: 'Enterprise',
    labelVi: 'Doanh nghiệp',
    value: OrganizationPlan.ENTERPRISE,
    maxMembers: -1, // unlimited
    maxProjects: -1, // unlimited
  },
]
