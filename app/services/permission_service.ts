/**
 * PermissionService (v3)
 *
 * Centralized permission checking service.
 * v3: All roles are inline VARCHAR strings on their respective tables.
 * No more preloading system_role/organization_role/project_role relationships.
 * Permission maps are defined in app/constants/permissions.ts.
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
 *
 * @module PermissionService
 */

import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { DatabaseId } from '#types/database'
import { SystemRoleName, OrganizationRole, ProjectRole as ProjectRoleEnum } from '#constants'
import { OrganizationUserStatus } from '#constants/organization_constants'
import { UserStatusName } from '#constants/user_constants'
import { AssignmentStatus } from '#constants/task_constants'
import { ProjectVisibility } from '#constants/project_constants'
import {
  hasSystemPermission,
  hasOrgPermission,
  hasProjectPermission,
  getOrgRoleLevel,
  getProjectRoleLevel,
  SYSTEM_ROLE_PERMISSIONS,
  ORG_ROLE_PERMISSIONS,
  PROJECT_ROLE_PERMISSIONS,
} from '#constants/permissions'
import User from '#models/user'
import OrganizationUser from '#models/organization_user'
import ProjectMember from '#models/project_member'
import Project from '#models/project'
import Task from '#models/task'
import TaskAssignment from '#models/task_assignment'

// ─── Types ───────────────────────────────────────────────

interface OrgMembershipInfo {
  org_role: string
  permissions: string[]
}

interface ProjectMembershipInfo {
  project_role: string
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
 * v3: reads user.system_role string directly — no preload.
 */
export async function isSystemSuperadmin(
  userId: DatabaseId,
  trx?: TransactionClientContract
): Promise<boolean> {
  const user = await User.query(queryOptions(trx))
    .where('id', userId)
    .whereNull('deleted_at')
    .first()

  return user?.system_role === SystemRoleName.SUPERADMIN
}

/**
 * Check if user is system admin (superadmin OR system_admin).
 * v3: reads user.system_role string directly — no preload.
 */
export async function isSystemAdmin(
  userId: DatabaseId,
  trx?: TransactionClientContract
): Promise<boolean> {
  const user = await User.query(queryOptions(trx))
    .where('id', userId)
    .whereNull('deleted_at')
    .first()

  if (!user?.system_role) return false
  return (
    user.system_role === SystemRoleName.SUPERADMIN ||
    user.system_role === SystemRoleName.SYSTEM_ADMIN
  )
}

/**
 * Check specific system-level permission.
 * v3: uses hasSystemPermission() from permissions.ts
 */
export async function checkSystemPermission(
  userId: DatabaseId,
  permission: string,
  trx?: TransactionClientContract
): Promise<boolean> {
  const user = await User.query(queryOptions(trx))
    .where('id', userId)
    .whereNull('deleted_at')
    .first()

  if (!user?.system_role) return false
  return hasSystemPermission(user.system_role, permission)
}

/**
 * Get the user's system role info in one query.
 * v3: reads inline system_role string, maps permissions from SYSTEM_ROLE_PERMISSIONS.
 */
export async function getSystemRoleInfo(
  userId: DatabaseId,
  trx?: TransactionClientContract
): Promise<SystemRoleInfo | null> {
  const user = await User.query(queryOptions(trx))
    .where('id', userId)
    .whereNull('deleted_at')
    .first()

  if (!user?.system_role) return null

  return {
    roleName: user.system_role,
    isSuperadmin: user.system_role === SystemRoleName.SUPERADMIN,
    isSystemAdmin:
      user.system_role === SystemRoleName.SUPERADMIN ||
      user.system_role === SystemRoleName.SYSTEM_ADMIN,
    permissions: [...(SYSTEM_ROLE_PERMISSIONS[user.system_role] ?? [])],
  }
}

// ─── Organization Level ──────────────────────────────────

/**
 * Get user's organization membership info.
 * v3: reads inline org_role string — no preload to organization_roles table.
 */
export async function getOrgMembership(
  userId: DatabaseId,
  organizationId: DatabaseId,
  trx?: TransactionClientContract
): Promise<OrgMembershipInfo | null> {
  const membership = await OrganizationUser.query(queryOptions(trx))
    .where('user_id', userId)
    .where('organization_id', organizationId)
    .where('status', OrganizationUserStatus.APPROVED)
    .first()

  if (!membership) return null

  return {
    org_role: membership.org_role,
    permissions: [...(ORG_ROLE_PERMISSIONS[membership.org_role] ?? [])],
  }
}

/**
 * Check if user is organization owner.
 */
export async function isOrgOwner(
  userId: DatabaseId,
  organizationId: DatabaseId,
  trx?: TransactionClientContract
): Promise<boolean> {
  const membership = await getOrgMembership(userId, organizationId, trx)
  return membership?.org_role === OrganizationRole.OWNER
}

/**
 * Check if user is organization admin or owner.
 */
export async function isOrgAdminOrOwner(
  userId: DatabaseId,
  organizationId: DatabaseId,
  trx?: TransactionClientContract
): Promise<boolean> {
  const membership = await getOrgMembership(userId, organizationId, trx)
  if (membership) {
    return (
      membership.org_role === OrganizationRole.OWNER ||
      membership.org_role === OrganizationRole.ADMIN
    )
  }

  // Only check superadmin if membership not found (rare path)
  return isSystemSuperadmin(userId, trx)
}

/**
 * Get user's organization role level.
 * @returns 3 = org_owner, 2 = org_admin, 1 = org_member, 0 = not a member
 */
export async function getUserOrgRoleLevel(
  userId: DatabaseId,
  organizationId: DatabaseId,
  trx?: TransactionClientContract
): Promise<number> {
  const membership = await getOrgMembership(userId, organizationId, trx)
  if (!membership) return 0
  return getOrgRoleLevel(membership.org_role)
}

/**
 * Check specific organization-level permission.
 * v3: uses hasOrgPermission() from permissions.ts
 */
export async function checkOrgPermission(
  userId: DatabaseId,
  organizationId: DatabaseId,
  permission: string,
  trx?: TransactionClientContract
): Promise<boolean> {
  const membership = await getOrgMembership(userId, organizationId, trx)
  if (membership) {
    return hasOrgPermission(membership.org_role, permission)
  }

  // Superadmin bypasses all
  return isSystemSuperadmin(userId, trx)
}

// ─── Project Level ───────────────────────────────────────

/**
 * Get user's project membership info.
 * v3: reads inline project_role string — no preload to project_roles table.
 */
export async function getProjectMembership(
  userId: DatabaseId,
  projectId: DatabaseId,
  trx?: TransactionClientContract
): Promise<ProjectMembershipInfo | null> {
  const member = await ProjectMember.query(queryOptions(trx))
    .where('user_id', userId)
    .where('project_id', projectId)
    .first()

  if (!member) return null

  return {
    project_role: member.project_role,
    permissions: [...(PROJECT_ROLE_PERMISSIONS[member.project_role] ?? [])],
  }
}

/**
 * Check if user is project owner.
 * Uses projects.owner_id (like DB function), not project_roles.
 */
export async function isProjectOwner(
  userId: DatabaseId,
  projectId: DatabaseId,
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
 */
export async function isProjectManagerOrOwner(
  userId: DatabaseId,
  projectId: DatabaseId,
  trx?: TransactionClientContract
): Promise<boolean> {
  const membership = await getProjectMembership(userId, projectId, trx)
  if (!membership) return false
  return (
    membership.project_role === ProjectRoleEnum.OWNER ||
    membership.project_role === ProjectRoleEnum.MANAGER
  )
}

/**
 * Get user's project role level.
 * @returns 4 = project_owner, 3 = project_manager, 2 = project_member, 1 = project_viewer, 0 = not member
 */
export async function getUserProjectRoleLevel(
  userId: DatabaseId,
  projectId: DatabaseId,
  trx?: TransactionClientContract
): Promise<number> {
  const membership = await getProjectMembership(userId, projectId, trx)
  if (!membership) return 0
  return getProjectRoleLevel(membership.project_role)
}

/**
 * Check specific project-level permission.
 * v3: uses permission maps from permissions.ts
 *
 * Logic:
 * 1. Superadmin → true
 * 2. Org admin/owner → true (except can_delete_project, can_transfer_ownership)
 * 3. Check project_members role permissions
 */
export async function checkProjectPermission(
  userId: DatabaseId,
  projectId: DatabaseId,
  permission: string,
  trx?: TransactionClientContract
): Promise<boolean> {
  const opts = queryOptions(trx)

  // Batch: user + project in parallel
  const [user, project] = await Promise.all([
    User.query(opts).where('id', userId).whereNull('deleted_at').first(),
    Project.query(opts).where('id', projectId).whereNull('deleted_at').first(),
  ])

  if (!user || !project) return false

  // Superadmin (no extra query — reads inline system_role)
  if (user.system_role === SystemRoleName.SUPERADMIN) return true

  // Org admin/owner gets most permissions (except delete/transfer)
  const orgHighPrivilegeExclusions = ['can_delete_project', 'can_transfer_ownership']
  if (!orgHighPrivilegeExclusions.includes(permission)) {
    const orgMembership = await OrganizationUser.query(opts)
      .where('user_id', userId)
      .where('organization_id', project.organization_id)
      .where('status', OrganizationUserStatus.APPROVED)
      .first()

    if (orgMembership) {
      if (
        orgMembership.org_role === OrganizationRole.OWNER ||
        orgMembership.org_role === OrganizationRole.ADMIN
      ) {
        return true
      }
    }
  }

  // Check project role permissions
  const membership = await getProjectMembership(userId, projectId, trx)
  if (!membership) return false

  return hasProjectPermission(membership.project_role, permission)
}

// ─── Task Level ──────────────────────────────────────────

/**
 * Check if user can update a task.
 * v3: no more preloading status/system_role relationships.
 * Reads inline strings directly.
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
  userId: DatabaseId,
  taskId: DatabaseId,
  trx?: TransactionClientContract
): Promise<boolean> {
  const opts = queryOptions(trx)

  // Batch load: user + task + assignment in parallel
  const [user, task, assignment] = await Promise.all([
    User.query(opts).where('id', userId).whereNull('deleted_at').first(),
    Task.query(opts).where('id', taskId).whereNull('deleted_at').first(),
    TaskAssignment.query(opts)
      .where('task_id', taskId)
      .where('assignee_id', userId)
      .where('assignment_status', AssignmentStatus.ACTIVE)
      .first(),
  ])

  // 1. User must be active
  if (!user || user.status !== UserStatusName.ACTIVE) return false

  // 2. Task must exist
  if (!task?.organization_id) return false

  // 3. Superadmin (reads inline system_role — no preload)
  if (user.system_role === SystemRoleName.SUPERADMIN) return true

  // 4. Creator check — load org membership only if needed
  if (task.creator_id === userId) {
    const creatorOrg = await OrganizationUser.query(opts)
      .where('user_id', userId)
      .where('organization_id', task.organization_id)
      .where('status', OrganizationUserStatus.APPROVED)
      .first()
    if (creatorOrg) return true
  }

  // 5. Org membership — load once, reuse for org admin check
  const orgMembership = await OrganizationUser.query(opts)
    .where('user_id', userId)
    .where('organization_id', task.organization_id)
    .where('status', OrganizationUserStatus.APPROVED)
    .first()

  // 5a. Org admin/owner
  if (orgMembership) {
    if (
      orgMembership.org_role === OrganizationRole.OWNER ||
      orgMembership.org_role === OrganizationRole.ADMIN
    ) {
      return true
    }
  }

  // 6. Project manager/owner
  if (task.project_id) {
    const projectMember = await ProjectMember.query(opts)
      .where('user_id', userId)
      .where('project_id', task.project_id)
      .first()

    if (projectMember) {
      if (
        projectMember.project_role === ProjectRoleEnum.OWNER ||
        projectMember.project_role === ProjectRoleEnum.MANAGER
      ) {
        return true
      }
    }
  }

  // 7. Active assignee (already loaded in parallel)
  if (assignment) return true

  return false
}

/**
 * Check if user can view a task.
 * v3: no more preloading status/system_role relationships.
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
  userId: DatabaseId,
  taskId: DatabaseId,
  trx?: TransactionClientContract
): Promise<boolean> {
  const opts = queryOptions(trx)

  // Batch load: user + task + assignment in parallel
  const [user, task, assignment] = await Promise.all([
    User.query(opts).where('id', userId).whereNull('deleted_at').first(),
    Task.query(opts).where('id', taskId).whereNull('deleted_at').first(),
    TaskAssignment.query(opts)
      .where('task_id', taskId)
      .where('assignee_id', userId)
      .where('assignment_status', AssignmentStatus.ACTIVE)
      .first(),
  ])

  // User must exist
  if (!user) return false

  // Task must exist
  if (!task?.organization_id) return false

  // Superadmin (reads inline system_role — no preload)
  if (user.system_role === SystemRoleName.SUPERADMIN) return true

  // Creator — instant check, no query
  if (task.creator_id === userId) return true

  // Active assignee (already loaded in parallel)
  if (assignment) return true

  // Org member (approved) — single query covers org admin/owner/member
  const orgMember = await OrganizationUser.query(opts)
    .where('user_id', userId)
    .where('organization_id', task.organization_id)
    .where('status', OrganizationUserStatus.APPROVED)
    .first()
  if (orgMember) return true

  // Project member
  if (task.project_id) {
    const projectMember = await ProjectMember.query(opts)
      .where('user_id', userId)
      .where('project_id', task.project_id)
      .first()
    if (projectMember) return true
  }

  // Marketplace visibility check
  if (task.task_visibility !== 'internal' && task.project_id) {
    const publicProject = await Project.query(opts)
      .where('id', task.project_id)
      .whereNull('deleted_at')
      .where('visibility', ProjectVisibility.PUBLIC)
      .first()

    if (publicProject && user.status === UserStatusName.ACTIVE) return true
  }

  return false
}

// ─── Composite Checks (convenience) ─────────────────────

/**
 * Check if user can manage a project.
 */
export async function canManageProject(
  userId: DatabaseId,
  projectOwnerId: DatabaseId | null,
  projectCreatorId: DatabaseId,
  organizationId: DatabaseId,
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
