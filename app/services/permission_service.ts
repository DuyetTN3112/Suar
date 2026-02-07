/**
 * PermissionService
 *
 * Centralized permission checking service.
 * Mirrors the database functions in suar.sql exactly:
 *
 * System level:
 *   - is_system_superadmin(user_id)
 *   - check_system_permission(user_id, permission_name)
 *
 * Organization level:
 *   - is_org_owner(user_id, org_id)
 *   - is_org_admin_or_owner(user_id, org_id)
 *   - check_organization_permission(user_id, org_id, permission_name)
 *   - get_user_org_role_level(user_id, org_id)
 *
 * Project level:
 *   - is_project_owner(user_id, project_id)
 *   - is_project_manager_or_owner(user_id, project_id)
 *   - check_project_permission(user_id, project_id, permission_name)
 *   - get_user_project_role_level(user_id, project_id)
 *
 * Task level:
 *   - can_user_update_task(user_id, task_id)
 *   - can_user_view_task(user_id, task_id)
 *
 * This service is STATELESS — no HttpContext dependency.
 * Uses Lucid Models for type-safe queries (no raw `db.from()` with untyped results).
 *
 * @module PermissionService
 */

import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import User from '#models/user'
import OrganizationUser from '#models/organization_user'
import ProjectMember from '#models/project_member'
import Project from '#models/project'
import Task from '#models/task'
import TaskAssignment from '#models/task_assignment'

// ─── Types ───────────────────────────────────────────────

interface OrgMembershipInfo {
  role_id: number
  role_name: string
  permissions: string[]
}

interface ProjectMembershipInfo {
  role_id: number
  role_name: string
  permissions: string[]
}

interface SystemRoleInfo {
  roleName: string | null
  isSuperadmin: boolean
  isSystemAdmin: boolean
  permissions: string[]
}

// ─── Helper ──────────────────────────────────────────────

function queryOptions(
  trx?: TransactionClientContract
): { client: TransactionClientContract } | undefined {
  return trx ? { client: trx } : undefined
}

// ─── System Level ────────────────────────────────────────

/**
 * Check if user is system superadmin.
 * Equivalent to DB function: is_system_superadmin(p_user_id)
 */
export async function isSystemSuperadmin(
  userId: number,
  trx?: TransactionClientContract
): Promise<boolean> {
  const user = await User.query(queryOptions(trx))
    .where('id', userId)
    .whereNull('deleted_at')
    .preload('system_role')
    .first()

  if (!user?.system_role) return false
  return user.system_role.isSuperAdmin()
}

/**
 * Check if user is system admin (superadmin OR system_admin).
 */
export async function isSystemAdmin(
  userId: number,
  trx?: TransactionClientContract
): Promise<boolean> {
  const user = await User.query(queryOptions(trx))
    .where('id', userId)
    .whereNull('deleted_at')
    .preload('system_role')
    .first()

  if (!user?.system_role) return false
  return user.system_role.isAdmin()
}

/**
 * Check specific system-level permission.
 * Equivalent to DB function: check_system_permission(p_user_id, p_permission_name)
 */
export async function checkSystemPermission(
  userId: number,
  permission: string,
  trx?: TransactionClientContract
): Promise<boolean> {
  const user = await User.query(queryOptions(trx))
    .where('id', userId)
    .whereNull('deleted_at')
    .preload('system_role')
    .first()

  if (!user?.system_role) return false
  return user.system_role.hasPermission(permission)
}

/**
 * Get the user's system role info in one query.
 */
export async function getSystemRoleInfo(
  userId: number,
  trx?: TransactionClientContract
): Promise<SystemRoleInfo | null> {
  const user = await User.query(queryOptions(trx))
    .where('id', userId)
    .whereNull('deleted_at')
    .preload('system_role')
    .first()

  if (!user?.system_role) return null

  const role = user.system_role
  return {
    roleName: role.name,
    isSuperadmin: role.isSuperAdmin(),
    isSystemAdmin: role.isAdmin(),
    permissions: role.permissions ?? [],
  }
}

// ─── Organization Level ──────────────────────────────────

/**
 * Get user's organization membership info.
 * Returns role_id, role_name, and permissions.
 * Returns null if user is not an approved member.
 */
export async function getOrgMembership(
  userId: number,
  organizationId: number,
  trx?: TransactionClientContract
): Promise<OrgMembershipInfo | null> {
  const membership = await OrganizationUser.query(queryOptions(trx))
    .where('user_id', userId)
    .where('organization_id', organizationId)
    .where('status', 'approved')
    .preload('organization_role')
    .first()

  if (!membership?.organization_role) return null

  const role = membership.organization_role
  return {
    role_id: role.id,
    role_name: role.name,
    permissions: role.permissions ?? [],
  }
}

/**
 * Check if user is organization owner.
 * Equivalent to DB function: is_org_owner(p_user_id, p_organization_id)
 */
export async function isOrgOwner(
  userId: number,
  organizationId: number,
  trx?: TransactionClientContract
): Promise<boolean> {
  const membership = await getOrgMembership(userId, organizationId, trx)
  return membership?.role_name === 'org_owner'
}

/**
 * Check if user is organization admin or owner.
 * Equivalent to DB function: is_org_admin_or_owner(p_user_id, p_organization_id)
 */
export async function isOrgAdminOrOwner(
  userId: number,
  organizationId: number,
  trx?: TransactionClientContract
): Promise<boolean> {
  // Superadmin bypasses all checks
  if (await isSystemSuperadmin(userId, trx)) return true

  const membership = await getOrgMembership(userId, organizationId, trx)
  if (!membership) return false
  return membership.role_name === 'org_owner' || membership.role_name === 'org_admin'
}

/**
 * Get user's organization role level.
 * Equivalent to DB function: get_user_org_role_level(p_user_id, p_organization_id)
 *
 * @returns 3 = org_owner, 2 = org_admin, 1 = org_member, 0 = not a member
 */
export async function getUserOrgRoleLevel(
  userId: number,
  organizationId: number,
  trx?: TransactionClientContract
): Promise<number> {
  const membership = await getOrgMembership(userId, organizationId, trx)
  if (!membership) return 0

  const levels: Record<string, number> = {
    org_owner: 3,
    org_admin: 2,
    org_member: 1,
  }
  return levels[membership.role_name] ?? 0
}

/**
 * Check specific organization-level permission.
 * Equivalent to DB function: check_organization_permission(p_user_id, p_organization_id, p_permission_name)
 */
export async function checkOrgPermission(
  userId: number,
  organizationId: number,
  permission: string,
  trx?: TransactionClientContract
): Promise<boolean> {
  // Superadmin bypasses all checks
  if (await isSystemSuperadmin(userId, trx)) return true

  const membership = await getOrgMembership(userId, organizationId, trx)
  if (!membership) return false

  return membership.permissions.includes(permission)
}

// ─── Project Level ───────────────────────────────────────

/**
 * Get user's project membership info.
 * Returns role_id, role_name, and permissions.
 */
export async function getProjectMembership(
  userId: number,
  projectId: number,
  trx?: TransactionClientContract
): Promise<ProjectMembershipInfo | null> {
  const member = await ProjectMember.query(queryOptions(trx))
    .where('user_id', userId)
    .where('project_id', projectId)
    .preload('project_role')
    .first()

  if (!member?.project_role) return null

  const role = member.project_role
  return {
    role_id: role.id,
    role_name: role.name,
    permissions: role.permissions,
  }
}

/**
 * Check if user is project owner.
 * Equivalent to DB function: is_project_owner(p_user_id, p_project_id)
 *
 * Note: Uses projects.owner_id (like DB function), not project_roles.
 */
export async function isProjectOwner(
  userId: number,
  projectId: number,
  trx?: TransactionClientContract
): Promise<boolean> {
  const project = await Project.query(queryOptions(trx))
    .where('id', projectId)
    .where('owner_id', userId)
    .whereNull('deleted_at')
    .first()

  return project !== null
}

/**
 * Check if user is project manager or owner.
 * Equivalent to DB function: is_project_manager_or_owner(p_user_id, p_project_id)
 */
export async function isProjectManagerOrOwner(
  userId: number,
  projectId: number,
  trx?: TransactionClientContract
): Promise<boolean> {
  const membership = await getProjectMembership(userId, projectId, trx)
  if (!membership) return false
  return membership.role_name === 'project_owner' || membership.role_name === 'project_manager'
}

/**
 * Get user's project role level.
 * Equivalent to DB function: get_user_project_role_level(p_user_id, p_project_id)
 *
 * @returns 2 = project_owner, 1 = project_manager, 0 = not member/no role
 */
export async function getUserProjectRoleLevel(
  userId: number,
  projectId: number,
  trx?: TransactionClientContract
): Promise<number> {
  const membership = await getProjectMembership(userId, projectId, trx)
  if (!membership) return 0

  const levels: Record<string, number> = {
    project_owner: 2,
    project_manager: 1,
  }
  return levels[membership.role_name] ?? 0
}

/**
 * Check specific project-level permission.
 * Equivalent to DB function: check_project_permission(p_user_id, p_project_id, p_permission_name)
 *
 * Logic:
 * 1. Superadmin → true
 * 2. Org admin/owner → true (except can_delete_project, can_transfer_ownership)
 * 3. Check project_members role permissions JSON
 */
export async function checkProjectPermission(
  userId: number,
  projectId: number,
  permission: string,
  trx?: TransactionClientContract
): Promise<boolean> {
  // Superadmin bypasses all
  if (await isSystemSuperadmin(userId, trx)) return true

  // Get project's organization_id
  const project = await Project.query(queryOptions(trx))
    .where('id', projectId)
    .whereNull('deleted_at')
    .first()

  if (!project) return false

  // Org admin/owner gets most permissions (except delete/transfer)
  const orgHighPrivilegeExclusions = ['can_delete_project', 'can_transfer_ownership']
  if (!orgHighPrivilegeExclusions.includes(permission)) {
    if (await isOrgAdminOrOwner(userId, project.organization_id, trx)) return true
  }

  // Check project role permissions
  const membership = await getProjectMembership(userId, projectId, trx)
  if (!membership) return false

  return membership.permissions.includes(permission)
}

// ─── Task Level ──────────────────────────────────────────

/**
 * Check if user can update a task.
 * Equivalent to DB function: can_user_update_task(p_user_id, p_task_id)
 *
 * Chain of authority:
 * 1. User must be active
 * 2. System superadmin → true
 * 3. Task creator (if still approved org member) → true
 * 4. Project manager/owner → true
 * 5. Org admin/owner → true
 * 6. Active task assignee → true
 */
export async function canUserUpdateTask(
  userId: number,
  taskId: number,
  trx?: TransactionClientContract
): Promise<boolean> {
  // 1. Check user is active
  const user = await User.query(queryOptions(trx))
    .where('id', userId)
    .whereNull('deleted_at')
    .preload('status')
    .first()

  if (!user?.status || user.status.name !== 'active') return false

  // 2. Get task info
  const task = await Task.query(queryOptions(trx))
    .where('id', taskId)
    .whereNull('deleted_at')
    .first()

  if (!task?.organization_id) return false

  // 3. Superadmin
  if (await isSystemSuperadmin(userId, trx)) return true

  // 4. Creator + approved org member
  if (task.creator_id === userId) {
    const creatorOrg = await OrganizationUser.query(queryOptions(trx))
      .where('user_id', userId)
      .where('organization_id', task.organization_id)
      .where('status', 'approved')
      .first()
    if (creatorOrg) return true
  }

  // 5. Project manager/owner
  if (task.project_id) {
    if (await isProjectManagerOrOwner(userId, task.project_id, trx)) return true
  }

  // 6. Org admin/owner
  if (await isOrgAdminOrOwner(userId, task.organization_id, trx)) return true

  // 7. Active assignee
  const assignment = await TaskAssignment.query(queryOptions(trx))
    .where('task_id', taskId)
    .where('assignee_id', userId)
    .where('assignment_status', 'active')
    .first()
  if (assignment) return true

  return false
}

/**
 * Check if user can view a task.
 * Equivalent to DB function: can_user_view_task(p_user_id, p_task_id)
 *
 * More permissive than update:
 * - Superadmin → true
 * - Creator → true
 * - Any approved org member → true
 * - Project member → true
 * - Active assignee → true
 * - Public listing + public project → any active user
 */
export async function canUserViewTask(
  userId: number,
  taskId: number,
  trx?: TransactionClientContract
): Promise<boolean> {
  // Check user exists
  const user = await User.query(queryOptions(trx))
    .where('id', userId)
    .whereNull('deleted_at')
    .first()
  if (!user) return false

  // Get task info
  const task = await Task.query(queryOptions(trx))
    .where('id', taskId)
    .whereNull('deleted_at')
    .first()

  if (!task?.organization_id) return false

  // Superadmin
  if (await isSystemSuperadmin(userId, trx)) return true

  // Creator
  if (task.creator_id === userId) return true

  // Org member (approved)
  const orgMember = await OrganizationUser.query(queryOptions(trx))
    .where('user_id', userId)
    .where('organization_id', task.organization_id)
    .where('status', 'approved')
    .first()
  if (orgMember) return true

  // Project member
  if (task.project_id) {
    const projectMember = await ProjectMember.query(queryOptions(trx))
      .where('user_id', userId)
      .where('project_id', task.project_id)
      .first()
    if (projectMember) return true
  }

  // Active assignee
  const assignment = await TaskAssignment.query(queryOptions(trx))
    .where('task_id', taskId)
    .where('assignee_id', userId)
    .where('assignment_status', 'active')
    .first()
  if (assignment) return true

  // Public listing check
  if (task.is_public_listing && task.project_id) {
    const publicProject = await Project.query(queryOptions(trx))
      .where('id', task.project_id)
      .whereNull('deleted_at')
      .where('visibility', 'public')
      .first()

    if (publicProject) {
      // Any active user can view — reuse the user we already loaded, just check status
      const activeUser = await User.query(queryOptions(trx))
        .where('id', userId)
        .whereNull('deleted_at')
        .preload('status')
        .first()
      if (activeUser?.status.name === 'active') return true
    }
  }

  return false
}

// ─── Composite Checks (convenience) ─────────────────────

/**
 * Check if user can manage a project.
 * This is the correct replacement for the buggy `checkIsSuperAdmin()` that was
 * copy-pasted across 4 project commands.
 *
 * A user can manage a project if they are:
 * 1. System superadmin
 * 2. Organization owner or admin (for the project's org)
 * 3. Project owner or creator
 */
export async function canManageProject(
  userId: number,
  projectOwnerId: number | null,
  projectCreatorId: number,
  organizationId: number,
  trx?: TransactionClientContract
): Promise<boolean> {
  // Direct ownership/creation check (no DB query needed)
  if (userId === projectOwnerId || userId === projectCreatorId) return true

  // System superadmin
  if (await isSystemSuperadmin(userId, trx)) return true

  // Org admin or owner
  if (await isOrgAdminOrOwner(userId, organizationId, trx)) return true

  return false
}

// ─── Default Export (namespace-like) ─────────────────────

const PermissionService = {
  // System
  isSystemSuperadmin,
  isSystemAdmin,
  checkSystemPermission,
  getSystemRoleInfo,

  // Organization
  getOrgMembership,
  isOrgOwner,
  isOrgAdminOrOwner,
  getUserOrgRoleLevel,
  checkOrgPermission,

  // Project
  getProjectMembership,
  isProjectOwner,
  isProjectManagerOrOwner,
  getUserProjectRoleLevel,
  checkProjectPermission,

  // Task
  canUserUpdateTask,
  canUserViewTask,

  // Composite
  canManageProject,
} as const

export default PermissionService
