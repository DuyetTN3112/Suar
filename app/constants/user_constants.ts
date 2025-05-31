/**
 * User Constants
 *
 * Constants liên quan đến User, UserStatus, SystemRole.
 * Pattern học từ ancarat-bo: enum + options array + helper function
 *
 * @module UserConstants
 */

/**
 * User Status Names
 * Tên các trạng thái user (stored in user_status table)
 */
export enum UserStatusName {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING_VERIFICATION = 'pending_verification',
}

export const userStatusOptions = [
  {
    label: 'Active',
    labelVi: 'Hoạt động',
    value: UserStatusName.ACTIVE,
    style: 'bg-green-100 text-green-800 border-green-200',
    color: '#22c55e',
  },
  {
    label: 'Inactive',
    labelVi: 'Không hoạt động',
    value: UserStatusName.INACTIVE,
    style: 'bg-gray-100 text-gray-800 border-gray-200',
    color: '#6b7280',
  },
  {
    label: 'Suspended',
    labelVi: 'Bị khóa',
    value: UserStatusName.SUSPENDED,
    style: 'bg-red-100 text-red-800 border-red-200',
    color: '#ef4444',
  },
  {
    label: 'Pending Verification',
    labelVi: 'Chờ xác minh',
    value: UserStatusName.PENDING_VERIFICATION,
    style: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    color: '#f59e0b',
  },
]

export function getUserStatusLabel(status: UserStatusName): string {
  return userStatusOptions.find((option) => option.value === status)?.label ?? 'Unknown'
}

export function getUserStatusLabelVi(status: UserStatusName): string {
  return userStatusOptions.find((option) => option.value === status)?.labelVi ?? 'Không xác định'
}

/**
 * System Role Names
 * Tên các role hệ thống (stored in system_roles table)
 */
export enum SystemRoleName {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  USER = 'user',
}

export const systemRoleOptions = [
  {
    label: 'Super Admin',
    labelVi: 'Quản trị viên cao cấp',
    value: SystemRoleName.SUPER_ADMIN,
    description: 'Toàn quyền hệ thống',
    style: 'bg-red-100 text-red-800 border-red-200',
  },
  {
    label: 'Admin',
    labelVi: 'Quản trị viên',
    value: SystemRoleName.ADMIN,
    description: 'Quản lý người dùng và nội dung',
    style: 'bg-purple-100 text-purple-800 border-purple-200',
  },
  {
    label: 'Moderator',
    labelVi: 'Điều hành viên',
    value: SystemRoleName.MODERATOR,
    description: 'Kiểm duyệt nội dung',
    style: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  {
    label: 'User',
    labelVi: 'Người dùng',
    value: SystemRoleName.USER,
    description: 'Người dùng thông thường',
    style: 'bg-gray-100 text-gray-800 border-gray-200',
  },
]

/**
 * OAuth Providers
 * Các provider OAuth được hỗ trợ
 */
export enum OAuthProvider {
  GOOGLE = 'google',
  GITHUB = 'github',
  FACEBOOK = 'facebook',
  LINKEDIN = 'linkedin',
}

export const oauthProviderOptions = [
  { label: 'Google', value: OAuthProvider.GOOGLE, icon: 'google' },
  { label: 'GitHub', value: OAuthProvider.GITHUB, icon: 'github' },
  { label: 'Facebook', value: OAuthProvider.FACEBOOK, icon: 'facebook' },
  { label: 'LinkedIn', value: OAuthProvider.LINKEDIN, icon: 'linkedin' },
]

/**
 * Proficiency Levels
 * Các mức độ thành thạo kỹ năng
 */
export enum ProficiencyLevel {
  BEGINNER = 1,
  INTERMEDIATE = 2,
  ADVANCED = 3,
  EXPERT = 4,
}

export const proficiencyLevelOptions = [
  {
    label: 'Beginner',
    labelVi: 'Mới bắt đầu',
    value: ProficiencyLevel.BEGINNER,
    description: '0-1 năm kinh nghiệm',
  },
  {
    label: 'Intermediate',
    labelVi: 'Trung bình',
    value: ProficiencyLevel.INTERMEDIATE,
    description: '1-3 năm kinh nghiệm',
  },
  {
    label: 'Advanced',
    labelVi: 'Nâng cao',
    value: ProficiencyLevel.ADVANCED,
    description: '3-5 năm kinh nghiệm',
  },
  {
    label: 'Expert',
    labelVi: 'Chuyên gia',
    value: ProficiencyLevel.EXPERT,
    description: '5+ năm kinh nghiệm',
  },
]

export function getProficiencyLevelLabel(level: ProficiencyLevel): string {
  return proficiencyLevelOptions.find((option) => option.value === level)?.label ?? 'Unknown'
}
