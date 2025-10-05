/**
 * User Constants
 *
 * Constants liên quan đến User, UserStatus, SystemRole.
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

export const AUTH_METHOD_VALUES = Object.values(AuthMethod)
export const USER_STATUS_VALUES = Object.values(UserStatusName)
export const SYSTEM_ROLE_VALUES = Object.values(SystemRoleName)

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
 * Skill category contract now lives in skills module.
 * Re-export kept for existing user-module callers.
 */
export {
  SKILL_CATEGORY_CODES,
  SKILL_CATEGORY_DISPLAY_CONFIG,
  SKILL_CATEGORY_LABELS,
  SKILL_CATEGORY_ORDER,
  SKILL_DISPLAY_TYPES as SkillDisplayType,
  SkillCategoryCode,
  isSkillCategoryCode,
  skillCategoryOptions,
} from '#modules/skills/constants/skill_constants'

export type {
  SkillCategoryCodeValue,
  SkillDisplayType as SkillDisplayTypeValue,
} from '#modules/skills/constants/skill_constants'
