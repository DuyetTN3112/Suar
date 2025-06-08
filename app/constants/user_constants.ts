/**
 * User Constants
 *
 * Constants liên quan đến User, UserStatus, SystemRole, ProficiencyLevel.
 * v3.0: system_role inline VARCHAR trên users table, proficiency_levels table xóa.
 *
 * CLEANUP 2026-03-01:
 *   - XÓA userStatusOptions, getUserStatusLabel, getUserStatusLabelVi → 0 usages
 *   - XÓA systemRoleOptions → 0 usages
 *   - XÓA oauthProviderOptions → 0 usages
 *   - XÓA getProficiencyLevelLabel → 0 usages
 *   - THÊM AuthMethod → DB v3 có auth_method CHECK ('google','github')
 *   - GIỮ OAuthProvider vì auth_method hiện tại map trực tiếp với OAuth login đang dùng
 *
 * @module UserConstants
 */

/**
 * User Status Names
 * v3.0 CHECK: 'active', 'inactive', 'suspended'
 */
export enum UserStatusName {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

/**
 * System Role Names
 * v3.0: inline VARCHAR CHECK trên users.system_role
 * Không còn system_roles table
 */
export enum SystemRoleName {
  SUPERADMIN = 'superadmin',
  SYSTEM_ADMIN = 'system_admin',
  REGISTERED_USER = 'registered_user',
}

/**
 * Auth Method — v3.0 inline CHECK trên users.auth_method
 * CHECK ('google', 'github')
 */
export enum AuthMethod {
  GOOGLE = 'google',
  GITHUB = 'github',
}

/**
 * OAuth Providers
 * Các provider OAuth được hỗ trợ
 * NOTE: DB v3 auth_method CHECK chỉ có 'google','github'.
 */
export enum OAuthProvider {
  GOOGLE = 'google',
  GITHUB = 'github',
}

/**
 * Proficiency Levels
 * v3.0: 8 string levels thay vì 4 integer IDs.
 * proficiency_levels table đã xóa, dùng level_code VARCHAR CHECK trên 3 bảng.
 */
export enum ProficiencyLevel {
  BEGINNER = 'beginner',
  ELEMENTARY = 'elementary',
  JUNIOR = 'junior',
  MIDDLE = 'middle',
  SENIOR = 'senior',
  LEAD = 'lead',
  PRINCIPAL = 'principal',
  MASTER = 'master',
}

export const proficiencyLevelOptions = [
  {
    label: 'Beginner',
    labelVi: 'Mới bắt đầu',
    value: ProficiencyLevel.BEGINNER,
    description: '0-1 năm kinh nghiệm',
    minPercentage: 0,
    maxPercentage: 12.5,
    colorHex: '#94a3b8',
    order: 1,
  },
  {
    label: 'Elementary',
    labelVi: 'Sơ cấp',
    value: ProficiencyLevel.ELEMENTARY,
    description: '1-2 năm kinh nghiệm',
    minPercentage: 12.5,
    maxPercentage: 25,
    colorHex: '#60a5fa',
    order: 2,
  },
  {
    label: 'Junior',
    labelVi: 'Junior',
    value: ProficiencyLevel.JUNIOR,
    description: '2-3 năm kinh nghiệm',
    minPercentage: 25,
    maxPercentage: 37.5,
    colorHex: '#34d399',
    order: 3,
  },
  {
    label: 'Middle',
    labelVi: 'Middle',
    value: ProficiencyLevel.MIDDLE,
    description: '3-5 năm kinh nghiệm',
    minPercentage: 37.5,
    maxPercentage: 50,
    colorHex: '#a78bfa',
    order: 4,
  },
  {
    label: 'Senior',
    labelVi: 'Senior',
    value: ProficiencyLevel.SENIOR,
    description: '5-7 năm kinh nghiệm',
    minPercentage: 50,
    maxPercentage: 62.5,
    colorHex: '#f97316',
    order: 5,
  },
  {
    label: 'Lead',
    labelVi: 'Lead',
    value: ProficiencyLevel.LEAD,
    description: '7-10 năm kinh nghiệm',
    minPercentage: 62.5,
    maxPercentage: 75,
    colorHex: '#ec4899',
    order: 6,
  },
  {
    label: 'Principal',
    labelVi: 'Principal',
    value: ProficiencyLevel.PRINCIPAL,
    description: '10-15 năm kinh nghiệm',
    minPercentage: 75,
    maxPercentage: 87.5,
    colorHex: '#ef4444',
    order: 7,
  },
  {
    label: 'Master',
    labelVi: 'Bậc thầy',
    value: ProficiencyLevel.MASTER,
    description: '15+ năm kinh nghiệm',
    minPercentage: 87.5,
    maxPercentage: 100,
    colorHex: '#eab308',
    order: 8,
  },
]

/**
 * Tìm level code tương ứng từ percentage
 */
export function getLevelCodeFromPercentage(percentage: number): ProficiencyLevel {
  for (const opt of proficiencyLevelOptions) {
    if (percentage >= opt.minPercentage && percentage < opt.maxPercentage) {
      return opt.value
    }
  }
  return ProficiencyLevel.MASTER // 100%
}

/**
 * Trust Tier codes (v3.0: thay trust_tiers table)
 */
export enum TrustTierCode {
  COMMUNITY = 'community',
  ORGANIZATION = 'organization',
  PARTNER = 'partner',
}

export const TRUST_TIER_WEIGHTS: Record<TrustTierCode, number> = {
  [TrustTierCode.COMMUNITY]: 0.5,
  [TrustTierCode.ORGANIZATION]: 0.8,
  [TrustTierCode.PARTNER]: 1.0,
}

/**
 * Skill Categories (v3.0: thay skill_categories table)
 * DB v3 CHECK: category_code IN ('technical', 'soft_skill', 'delivery')
 */
export enum SkillCategoryCode {
  TECHNICAL = 'technical',
  SOFT_SKILL = 'soft_skill',
  DELIVERY = 'delivery',
}

/**
 * DB v3 CHECK: display_type IN ('spider_chart', 'list')
 */
export enum SkillDisplayType {
  SPIDER_CHART = 'spider_chart',
  LIST = 'list',
}

export const skillCategoryOptions = [
  {
    label: 'Technical',
    labelVi: 'Kỹ thuật',
    value: SkillCategoryCode.TECHNICAL,
    displayType: SkillDisplayType.SPIDER_CHART,
  },
  {
    label: 'Soft Skills',
    labelVi: 'Kỹ năng mềm',
    value: SkillCategoryCode.SOFT_SKILL,
    displayType: SkillDisplayType.SPIDER_CHART,
  },
  {
    label: 'Delivery',
    labelVi: 'Chất lượng giao hàng',
    value: SkillCategoryCode.DELIVERY,
    displayType: SkillDisplayType.LIST,
  },
]
