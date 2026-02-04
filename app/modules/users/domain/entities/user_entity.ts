/**
 * UserEntity — Pure Domain Entity
 *
 * Represents a User in the business domain.
 * 100% pure TypeScript, NO framework dependencies.
 * Business logic lõi được implement ở đây.
 *
 * Theo image: "bao gồm các hàm liên quan đến business logic
 * được implement ở đây, không được sử dụng các framework hay thư viện ở đây"
 */

import type { PolicyResult } from '#modules/policies/domain/policy_result'
import { PolicyResult as PR } from '#modules/policies/domain/policy_result'

export type UserStatus = 'active' | 'inactive' | 'suspended'
export type UserSystemRole = 'superadmin' | 'system_admin' | 'registered_user'
export type UserAuthMethod = 'google' | 'github'

export interface UserProfileSettings {
  is_searchable: boolean
  show_contact_info: boolean
  show_organizations: boolean
  show_projects: boolean
  show_spider_chart: boolean
  show_technical_skills: boolean
  custom_headline: string | null
  preferred_job_types: string[]
  preferred_locations: string[]
  min_salary_expectation: number | null
  salary_currency: string
  available_from: string | null
}

export interface UserTrustData {
  current_tier_code: string | null
  calculated_score: number
  raw_score: number
  total_verified_reviews: number
  last_calculated_at: string | null
  scoring_version?: string
  performance_score?: number
  performance_breakdown?: {
    quality_score: number
    delivery_score: number
    difficulty_bonus: number
    consistency_score: number
    calculated_at: string | null
  }
}

export interface UserCredibilityData {
  credibility_score: number
  total_reviews_given: number
  accurate_reviews: number
  disputed_reviews: number
  last_calculated_at: string | null
}

export interface UserEntityProps {
  id: string
  username: string
  email: string | null
  status: UserStatus
  systemRole: UserSystemRole
  currentOrganizationId: string | null
  authMethod: UserAuthMethod
  avatarUrl: string | null
  bio: string | null
  phone: string | null
  address: string | null
  timezone: string
  language: string
  isFreelancer: boolean
  freelancerRating: number | null
  freelancerCompletedTasksCount: number
  profileSettings: UserProfileSettings | null
  trustData: UserTrustData | null
  credibilityData: UserCredibilityData | null
  deletedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export class UserEntity {
  readonly id: string
  readonly username: string
  readonly email: string | null
  readonly status: UserStatus
  readonly systemRole: UserSystemRole
  readonly currentOrganizationId: string | null
  readonly authMethod: UserAuthMethod
  readonly avatarUrl: string | null
  readonly bio: string | null
  readonly phone: string | null
  readonly address: string | null
  readonly timezone: string
  readonly language: string
  readonly isFreelancer: boolean
  readonly freelancerRating: number | null
  readonly freelancerCompletedTasksCount: number
  readonly profileSettings: UserProfileSettings | null
  readonly trustData: UserTrustData | null
  readonly credibilityData: UserCredibilityData | null
  readonly deletedAt: Date | null
  readonly createdAt: Date
  readonly updatedAt: Date

  constructor(props: UserEntityProps) {
    this.id = props.id
    this.username = props.username
    this.email = props.email
    this.status = props.status
    this.systemRole = props.systemRole
    this.currentOrganizationId = props.currentOrganizationId
    this.authMethod = props.authMethod
    this.avatarUrl = props.avatarUrl
    this.bio = props.bio
    this.phone = props.phone
    this.address = props.address
    this.timezone = props.timezone
    this.language = props.language
    this.isFreelancer = props.isFreelancer
    this.freelancerRating = props.freelancerRating
    this.freelancerCompletedTasksCount = props.freelancerCompletedTasksCount
    this.profileSettings = props.profileSettings
    this.trustData = props.trustData
    this.credibilityData = props.credibilityData
    this.deletedAt = props.deletedAt
    this.createdAt = props.createdAt
    this.updatedAt = props.updatedAt
  }

  // ===== State Queries (business logic) =====

  get isActive(): boolean {
    return this.status === 'active' && this.deletedAt === null
  }

  get isAdmin(): boolean {
    return this.systemRole === 'superadmin' || this.systemRole === 'system_admin'
  }

  get isSuperadmin(): boolean {
    return this.systemRole === 'superadmin'
  }

  get isDeleted(): boolean {
    return this.deletedAt !== null
  }

  // ===== Business Rules (pure, no DB deps) =====

  /**
   * Kiểm tra user hiện tại có thể thay đổi role của targetUser không.
   *
   * Rules:
   * - Chỉ superadmin mới có quyền
   * - Không thể thay đổi role của chính mình
   * - Role mới phải hợp lệ
   */
  canChangeRoleOf(targetUserId: string, newRole: string): PolicyResult {
    if (!this.isSuperadmin) {
      return PR.deny('Chỉ superadmin mới có thể thay đổi vai trò người dùng')
    }
    if (this.id === targetUserId) {
      return PR.deny('Không thể thay đổi vai trò của chính mình', 'BUSINESS_RULE')
    }
    const validRoles: string[] = ['superadmin', 'system_admin', 'registered_user']
    if (!validRoles.includes(newRole)) {
      return PR.deny(`Vai trò không hợp lệ: ${newRole}`, 'BUSINESS_RULE')
    }
    return PR.allow()
  }

  /**
   * Kiểm tra user hiện tại có thể deactivate targetUser không.
   *
   * Rules:
   * - Chỉ superadmin mới có quyền
   * - Không thể deactivate chính mình
   */
  canDeactivate(targetUserId: string): PolicyResult {
    if (!this.isSuperadmin) {
      return PR.deny('Chỉ superadmin mới có thể deactivate users')
    }
    if (this.id === targetUserId) {
      return PR.deny('Không thể deactivate chính mình', 'BUSINESS_RULE')
    }
    return PR.allow()
  }

  /**
   * Kiểm tra user có thể phê duyệt thành viên không.
   *
   * Rules:
   * - Actor phải có quyền 'can_approve_members'
   * - Target user phải ở trạng thái 'pending'
   */
  canApproveUser(
    hasApprovePermission: boolean,
    targetMembershipStatus: string | null
  ): PolicyResult {
    if (!hasApprovePermission) {
      return PR.deny('Bạn không có quyền phê duyệt thành viên trong tổ chức này')
    }
    if (targetMembershipStatus !== 'pending') {
      return PR.deny(
        'Không tìm thấy yêu cầu phê duyệt người dùng này hoặc người dùng đã được phê duyệt',
        'BUSINESS_RULE'
      )
    }
    return PR.allow()
  }

  /**
   * Validate system role name.
   */
  static validateSystemRole(role: string): PolicyResult {
    const validRoles: string[] = ['superadmin', 'system_admin', 'registered_user']
    if (!validRoles.includes(role)) {
      return PR.deny(`Vai trò không hợp lệ: ${role}`, 'BUSINESS_RULE')
    }
    return PR.allow()
  }
}
