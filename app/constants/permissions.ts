/**
 * Permissions Constants
 *
 * v3.0: Hardcoded permission maps for built-in roles.
 * Trước đây lưu trong DB lookup tables (system_roles, organization_roles, project_roles).
 * Giờ inline trong app constants.
 *
 * Mirrors logic từ v3.0 permission functions:
 *   - check_system_permission()
 *   - check_organization_permission()
 *   - check_project_permission()
 *
 * @module Permissions
 */

import { OrganizationRole } from './organization_constants.js'
import { ProjectRole } from './project_constants.js'
import { SystemRoleName } from './user_constants.js'

// ============================================================================
// System Role Permissions
// ============================================================================

/**
 * System-level permissions per system_role.
 * - superadmin: ALL permissions (wildcard '*')
 * - system_admin: limited system management
 * - registered_user: no system-level permissions
 */
export const SYSTEM_ROLE_PERMISSIONS: Record<string, readonly string[]> = {
  [SystemRoleName.SUPERADMIN]: ['*'], // superadmin has ALL permissions
  [SystemRoleName.SYSTEM_ADMIN]: [
    'can_manage_users',
    'can_view_all_organizations',
    'can_view_system_logs',
    'can_view_reports',
    'can_manage_system_settings',
  ],
  [SystemRoleName.REGISTERED_USER]: [],
} as const

// ============================================================================
// Organization Role Permissions
// ============================================================================

/**
 * Organization-level permissions per org_role.
 * org_owner > org_admin > org_member
 */
export const ORG_ROLE_PERMISSIONS: Record<string, readonly string[]> = {
  [OrganizationRole.OWNER]: [
    'can_create_project',
    'can_manage_members',
    'can_delete_organization',
    'can_view_all_projects',
    'can_transfer_ownership',
    'can_manage_settings',
    'can_create_custom_roles',
    'can_invite_members',
    'can_approve_members',
    'can_remove_members',
    'can_view_audit_logs',
    'can_manage_integrations',
  ],
  [OrganizationRole.ADMIN]: [
    'can_create_project',
    'can_manage_members',
    'can_view_all_projects',
    'can_invite_members',
    'can_approve_members',
    'can_remove_members',
    'can_manage_settings',
    'can_view_audit_logs',
  ],
  [OrganizationRole.MEMBER]: [
    'can_view_assigned_projects',
    'can_update_own_tasks',
    'can_view_organization_info',
    'can_comment_on_tasks',
    'can_upload_task_files',
  ],
} as const

// ============================================================================
// Project Role Permissions
// ============================================================================

/**
 * Project-level permissions per project_role.
 * project_owner > project_manager > project_member > project_viewer
 */
export const PROJECT_ROLE_PERMISSIONS: Record<string, readonly string[]> = {
  [ProjectRole.OWNER]: [
    'can_delete_project',
    'can_manage_members',
    'can_create_task',
    'can_assign_task',
    'can_update_any_task',
    'can_delete_any_task',
    'can_invite_freelancer',
    'can_approve_application',
    'can_transfer_ownership',
    'can_manage_project_settings',
    'can_view_all_tasks',
    'can_manage_project_budget',
    'can_export_project_data',
  ],
  [ProjectRole.MANAGER]: [
    'can_manage_members',
    'can_create_task',
    'can_assign_task',
    'can_update_task',
    'can_delete_task',
    'can_invite_freelancer',
    'can_approve_application',
    'can_view_all_tasks',
    'can_review_completed_tasks',
    'can_manage_task_priorities',
    'can_view_project_reports',
  ],
  [ProjectRole.MEMBER]: [
    'can_view_assigned_tasks',
    'can_update_own_tasks',
    'can_comment_on_tasks',
    'can_upload_task_files',
  ],
  [ProjectRole.VIEWER]: ['can_view_all_tasks'],
} as const

// ============================================================================
// Role Level Hierarchy (for comparison)
// ============================================================================

/**
 * Org role level: lower = more powerful.
 * Used by get_user_org_role_level() equivalent.
 */
export const ORG_ROLE_LEVEL: Record<string, number> = {
  [OrganizationRole.OWNER]: 1,
  [OrganizationRole.ADMIN]: 2,
  [OrganizationRole.MEMBER]: 3,
}

/**
 * Project role level: lower = more powerful.
 * Used by get_user_project_role_level() equivalent.
 */
export const PROJECT_ROLE_LEVEL: Record<string, number> = {
  [ProjectRole.OWNER]: 1,
  [ProjectRole.MANAGER]: 2,
  [ProjectRole.MEMBER]: 3,
  [ProjectRole.VIEWER]: 4,
}

// ============================================================================
// Permission Helper Functions
// ============================================================================

/**
 * Check if a system role has a specific permission
 */
export function hasSystemPermission(role: string, permission: string): boolean {
  const permissions = SYSTEM_ROLE_PERMISSIONS[role]
  if (!permissions) return false
  if (permissions.includes('*')) return true
  return permissions.includes(permission)
}

/**
 * Check if an org role has a specific permission (built-in roles only).
 * For custom roles, caller must check organizations.custom_roles JSONB.
 */
export function hasOrgPermission(role: string, permission: string): boolean {
  const permissions = ORG_ROLE_PERMISSIONS[role]
  if (!permissions) return false
  return permissions.includes(permission)
}

/**
 * Check if a project role has a specific permission (built-in roles only).
 * For custom roles, caller must check projects.custom_roles JSONB.
 */
export function hasProjectPermission(role: string, permission: string): boolean {
  const permissions = PROJECT_ROLE_PERMISSIONS[role]
  if (!permissions) return false
  return permissions.includes(permission)
}

/**
 * Get org role level (1=owner, 2=admin, 3=member, 0=unknown)
 */
export function getOrgRoleLevel(role: string): number {
  return ORG_ROLE_LEVEL[role] ?? 0
}

/**
 * Get project role level (1=owner, 2=manager, 3=member, 4=viewer, 0=unknown)
 */
export function getProjectRoleLevel(role: string): number {
  return PROJECT_ROLE_LEVEL[role] ?? 0
}
