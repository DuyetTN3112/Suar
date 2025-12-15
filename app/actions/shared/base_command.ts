import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { Result } from './result.js'
import type { CommandHandler } from './interfaces.js'
import AuditLog from '#models/audit_log'

/**
 * Base Command Class
 * All Commands (Write operations) should extend this class
 *
 * Commands follow CQRS principles:
 * - They change system state
 * - They should be named with user intent (e.g., RegisterUserCommand, not CreateUserCommand)
 * - They use imperative verbs
 *
 * Example:
 * ```typescript
 * export default class RegisterUserCommand extends BaseCommand<RegisterUserDTO, User> {
 *   async handle(dto: RegisterUserDTO): Promise<User> {
 *     return await this.executeInTransaction(async (trx) => {
 *       const user = await this.createUser(dto, trx)
 *       await this.createUserProfile(user.id, dto, trx)
 *       return user
 *     })
 *   }
 * }
 * ```
 */
export abstract class BaseCommand<TInput, TOutput = void> implements CommandHandler<
  TInput,
  TOutput
> {
  constructor(protected ctx: HttpContext) { }

  /**
   * Main handler method - must be implemented by subclasses
   * This is where the command logic goes
   */
  abstract handle(input: TInput): Promise<TOutput>

  /**
   * Execute logic within a database transaction
   * Automatically commits on success, rolls back on error
   *
   * @param callback - Async function that performs database operations
   * @returns Result of the transaction
   */
  protected async executeInTransaction<T>(
    callback: (trx: TransactionClientContract) => Promise<T>
  ): Promise<T> {
    return await db.transaction(callback)
  }

  /**
   * Log audit trail for this command
   * Should be called for any state-changing operations
   *
   * @param action - Action name (e.g., 'create', 'update', 'delete')
   * @param entityType - Type of entity (e.g., 'user', 'task', 'organization')
   * @param entityId - ID of the affected entity
   * @param oldValues - Previous values (for updates)
   * @param newValues - New values
   */
  protected async logAudit(
    action: string,
    entityType: string,
    entityId: number,
    oldValues?: object | null,
    newValues?: object | null
  ): Promise<void> {
    const user = this.ctx.auth.user
    if (!user) return

    await AuditLog.create({
      user_id: user.id,
      action,
      entity_type: entityType,
      entity_id: entityId,
      old_values: oldValues,
      new_values: newValues,
      ip_address: this.ctx.request.ip(),
      user_agent: this.ctx.request.header('user-agent'),
    })
  }

  /**
   * Get current authenticated user
   * Throws error if user is not authenticated
   */
  protected getCurrentUser() {
    const user = this.ctx.auth.user
    if (!user) {
      throw new Error('User must be authenticated to execute this command')
    }
    return user
  }

  /**
   * Get current organization ID from session
   * Throws error if not found
   */
  protected getCurrentOrganizationId(): number {
    const organizationId = this.ctx.session.get('current_organization_id')
    if (!organizationId) {
      throw new Error('Current organization not found in session')
    }
    return Number(organizationId)
  }

  /**
   * Execute command and wrap result in Result<T>
   * Use this for commands that need explicit success/failure handling
   *
   * @param input - Command input
   * @returns Result wrapper with success/failure state
   */
  async executeAndWrap(input: TInput): Promise<Result<TOutput>> {
    try {
      const result = await this.handle(input)
      return Result.ok(result)
    } catch (error) {
      return Result.fail(error) as Result<TOutput>
    }
  }

  // ==================== PERMISSION METHODS ====================
  // Di chuyển từ database functions: is_system_superadmin, is_org_admin_or_owner, etc.

  /**
   * Check if current user is system superadmin
   * Equivalent to: is_system_superadmin(p_user_id)
   */
  protected async isSystemSuperadmin(): Promise<boolean> {
    const user = this.ctx.auth.user
    if (!user) return false

    const userData = await db
      .from('users')
      .join('system_roles', 'users.system_role_id', 'system_roles.id')
      .where('users.id', user.id)
      .whereNull('users.deleted_at')
      .select('system_roles.name as role_name')
      .first()

    return userData?.role_name === 'superadmin'
  }

  /**
   * Get user's organization membership
   * Returns role_id and role_name if approved member, null otherwise
   */
  protected async getOrgMembership(
    userId: number,
    organizationId: number,
    trx?: TransactionClientContract
  ): Promise<{ role_id: number; role_name: string } | null> {
    let query = db
      .from('organization_users')
      .join('organization_roles', 'organization_users.role_id', 'organization_roles.id')
      .where('organization_users.user_id', userId)
      .where('organization_users.organization_id', organizationId)
      .where('organization_users.status', 'approved')
      .select('organization_roles.id as role_id', 'organization_roles.name as role_name')

    if (trx) {
      query = query.useTransaction(trx)
    }

    return await query.first()
  }

  /**
   * Get user's organization role level
   * Equivalent to: get_user_org_role_level(p_user_id, p_organization_id)
   *
   * @returns 3 = org_owner, 2 = org_admin, 1 = org_member, 0 = none
   */
  protected async getUserOrgRoleLevel(
    userId: number,
    organizationId: number,
    trx?: TransactionClientContract
  ): Promise<number> {
    const membership = await this.getOrgMembership(userId, organizationId, trx)
    if (!membership) return 0

    const roleLevels: Record<string, number> = {
      org_owner: 3,
      org_admin: 2,
      org_member: 1,
    }

    return roleLevels[membership.role_name] || 0
  }

  /**
   * Check if user is organization admin or owner
   * Equivalent to: is_org_admin_or_owner(p_user_id, p_organization_id)
   */
  protected async isOrgAdminOrOwner(
    userId: number,
    organizationId: number,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    // Superadmin có tất cả quyền
    if (await this.isSystemSuperadmin()) return true

    const membership = await this.getOrgMembership(userId, organizationId, trx)
    if (!membership) return false

    return ['org_owner', 'org_admin'].includes(membership.role_name)
  }

  /**
   * Check organization permission
   * Equivalent to: check_organization_permission(p_user_id, p_organization_id, p_permission_name)
   *
   * Logic từ database:
   * 1. Check user exists (deleted_at IS NULL)
   * 2. Check organization exists (deleted_at IS NULL)
   * 3. Check superadmin → return true
   * 4. Check membership status = 'approved'
   * 5. Check JSON_CONTAINS permissions
   */
  protected async checkOrgPermission(
    userId: number,
    organizationId: number,
    permission: string,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    // 1. Check user exists (theo database)
    let userQuery = db.from('users').where('id', userId).whereNull('deleted_at')
    if (trx) userQuery = userQuery.useTransaction(trx)
    const userExists = await userQuery.first()
    if (!userExists) return false

    // 2. Check organization exists (theo database)
    let orgQuery = db.from('organizations').where('id', organizationId).whereNull('deleted_at')
    if (trx) orgQuery = orgQuery.useTransaction(trx)
    const orgExists = await orgQuery.first()
    if (!orgExists) return false

    // 3. Superadmin có tất cả quyền
    if (await this.isSystemSuperadmin()) return true

    // 4. Check membership status = 'approved'
    let query = db
      .from('organization_users')
      .join('organization_roles', 'organization_users.role_id', 'organization_roles.id')
      .where('organization_users.user_id', userId)
      .where('organization_users.organization_id', organizationId)
      .where('organization_users.status', 'approved')
      .select('organization_roles.permissions')

    if (trx) {
      query = query.useTransaction(trx)
    }

    const result = await query.first()
    if (!result || !result.permissions) return false

    // 5. Check JSON_CONTAINS permissions
    const permissions =
      typeof result.permissions === 'string'
        ? JSON.parse(result.permissions)
        : result.permissions

    return Array.isArray(permissions) && permissions.includes(permission)
  }

  /**
   * Get user's project role level
   * Equivalent to: get_user_project_role_level(p_user_id, p_project_id)
   *
   * @returns 2 = project_owner, 1 = project_manager, 0 = none
   */
  protected async getUserProjectRoleLevel(
    userId: number,
    projectId: number,
    trx?: TransactionClientContract
  ): Promise<number> {
    let query = db
      .from('project_members')
      .join('project_roles', 'project_members.project_role_id', 'project_roles.id')
      .where('project_members.user_id', userId)
      .where('project_members.project_id', projectId)
      .select('project_roles.name as role_name')

    if (trx) {
      query = query.useTransaction(trx)
    }

    const membership = await query.first()
    if (!membership) return 0

    const roleLevels: Record<string, number> = {
      project_owner: 2,
      project_manager: 1,
    }

    return roleLevels[membership.role_name] || 0
  }

  /**
   * Check if user is project manager or owner
   * Equivalent to: is_project_manager_or_owner(p_user_id, p_project_id)
   */
  protected async isProjectManagerOrOwner(
    userId: number,
    projectId: number,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    const level = await this.getUserProjectRoleLevel(userId, projectId, trx)
    return level >= 1
  }

  /**
   * Check if user is organization owner
   * Equivalent to: is_org_owner(p_user_id, p_organization_id)
   *
   * Logic từ database:
   * 1. Check user exists
   * 2. Check organization exists
   * 3. Check org_users với role_name = 'org_owner' và status = 'approved'
   */
  protected async isOrgOwner(
    userId: number,
    organizationId: number,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    // 1. Check user exists
    let userQuery = db.from('users').where('id', userId).whereNull('deleted_at')
    if (trx) userQuery = userQuery.useTransaction(trx)
    if (!(await userQuery.first())) return false

    // 2. Check organization exists
    let orgQuery = db.from('organizations').where('id', organizationId).whereNull('deleted_at')
    if (trx) orgQuery = orgQuery.useTransaction(trx)
    if (!(await orgQuery.first())) return false

    // 3. Check org_users với role_name = 'org_owner'
    let query = db
      .from('organization_users')
      .join('organization_roles', 'organization_users.role_id', 'organization_roles.id')
      .where('organization_users.user_id', userId)
      .where('organization_users.organization_id', organizationId)
      .where('organization_roles.name', 'org_owner')
      .where('organization_users.status', 'approved')
    if (trx) query = query.useTransaction(trx)

    return !!(await query.first())
  }

  /**
   * Check if user is project owner
   * Equivalent to: is_project_owner(p_user_id, p_project_id)
   *
   * Logic từ database:
   * 1. Check user exists
   * 2. Check project exists
   * 3. Check projects.owner_id = p_user_id
   */
  protected async isProjectOwner(
    userId: number,
    projectId: number,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    // 1. Check user exists
    let userQuery = db.from('users').where('id', userId).whereNull('deleted_at')
    if (trx) userQuery = userQuery.useTransaction(trx)
    if (!(await userQuery.first())) return false

    // 2. Check project exists and user is owner
    let query = db
      .from('projects')
      .where('id', projectId)
      .where('owner_id', userId)
      .whereNull('deleted_at')
    if (trx) query = query.useTransaction(trx)

    return !!(await query.first())
  }

  /**
   * Check system permission
   * Equivalent to: check_system_permission(p_user_id, p_permission_name)
   *
   * Logic từ database:
   * 1. Check user exists
   * 2. Get system_role name và permissions
   * 3. Superadmin → return true
   * 4. Check JSON_CONTAINS permissions
   */
  protected async checkSystemPermission(
    userId: number,
    permission: string,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    // 1. Check user exists
    let userQuery = db.from('users').where('id', userId).whereNull('deleted_at')
    if (trx) userQuery = userQuery.useTransaction(trx)
    if (!(await userQuery.first())) return false

    // 2. Get system_role
    let query = db
      .from('users')
      .join('system_roles', 'users.system_role_id', 'system_roles.id')
      .where('users.id', userId)
      .whereNull('users.deleted_at')
      .select('system_roles.name as role_name', 'system_roles.permissions')
    if (trx) query = query.useTransaction(trx)

    const result = await query.first()
    if (!result) return false

    // 3. Superadmin → return true
    if (result.role_name === 'superadmin') return true

    // 4. Check permissions
    if (!result.permissions) return false
    const permissions =
      typeof result.permissions === 'string'
        ? JSON.parse(result.permissions)
        : result.permissions

    return Array.isArray(permissions) && permissions.includes(permission)
  }

  /**
   * Check project permission
   * Equivalent to: check_project_permission(p_user_id, p_project_id, p_permission_name)
   *
   * Logic từ database:
   * 1. Check user exists
   * 2. Check project exists
   * 3. Check superadmin → return true
   * 4. Check membership và permissions
   */
  protected async checkProjectPermission(
    userId: number,
    projectId: number,
    permission: string,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    // 1. Check user exists
    let userQuery = db.from('users').where('id', userId).whereNull('deleted_at')
    if (trx) userQuery = userQuery.useTransaction(trx)
    if (!(await userQuery.first())) return false

    // 2. Check project exists
    let projectQuery = db.from('projects').where('id', projectId).whereNull('deleted_at')
    if (trx) projectQuery = projectQuery.useTransaction(trx)
    if (!(await projectQuery.first())) return false

    // 3. Superadmin → return true
    if (await this.isSystemSuperadmin()) return true

    // 4. Check membership và permissions
    let query = db
      .from('project_members')
      .join('project_roles', 'project_members.project_role_id', 'project_roles.id')
      .where('project_members.user_id', userId)
      .where('project_members.project_id', projectId)
      .select('project_roles.permissions')
    if (trx) query = query.useTransaction(trx)

    const result = await query.first()
    if (!result || !result.permissions) return false

    const permissions =
      typeof result.permissions === 'string'
        ? JSON.parse(result.permissions)
        : result.permissions

    return Array.isArray(permissions) && permissions.includes(permission)
  }

  /**
   * Check if user can update task
   * Equivalent to: can_user_update_task(p_user_id, p_task_id)
   *
   * Logic từ database:
   * 1. Check user active (deleted_at IS NULL và status = 'active')
   * 2. Get task info (project_id, organization_id, creator_id)
   * 3. Check superadmin → return true
   * 4. Check creator + còn là org member approved → return true
   * 5. Check project manager/owner → return true
   * 6. Check org admin/owner → return true
   * 7. Check active task_assignment → return true
   */
  protected async canUserUpdateTask(
    userId: number,
    taskId: number,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    // 1. Check user active (deleted_at IS NULL và status = 'active')
    let userQuery = db
      .from('users')
      .join('user_status', 'users.status_id', 'user_status.id')
      .where('users.id', userId)
      .whereNull('users.deleted_at')
      .where('user_status.name', 'active')
    if (trx) userQuery = userQuery.useTransaction(trx)
    if (!(await userQuery.first())) return false

    // 2. Get task info
    let taskQuery = db
      .from('tasks')
      .where('id', taskId)
      .whereNull('deleted_at')
      .select('project_id', 'organization_id', 'creator_id')
    if (trx) taskQuery = taskQuery.useTransaction(trx)
    const task = await taskQuery.first()
    if (!task || !task.organization_id) return false

    // 3. Check superadmin
    if (await this.isSystemSuperadmin()) return true

    // 4. Check creator + org member approved
    if (task.creator_id === userId) {
      let creatorOrgQuery = db
        .from('organization_users')
        .where('user_id', userId)
        .where('organization_id', task.organization_id)
        .where('status', 'approved')
      if (trx) creatorOrgQuery = creatorOrgQuery.useTransaction(trx)
      if (await creatorOrgQuery.first()) return true
    }

    // 5. Check project manager/owner (nếu task thuộc project)
    if (task.project_id) {
      if (await this.isProjectManagerOrOwner(userId, task.project_id, trx)) return true
    }

    // 6. Check org admin/owner
    if (await this.isOrgAdminOrOwner(userId, task.organization_id, trx)) return true

    // 7. Check active task_assignment
    let assignmentQuery = db
      .from('task_assignments')
      .where('task_id', taskId)
      .where('assignee_id', userId)
      .where('assignment_status', 'active')
    if (trx) assignmentQuery = assignmentQuery.useTransaction(trx)
    if (await assignmentQuery.first()) return true

    return false
  }

  /**
   * Check if user can view task
   * Equivalent to: can_user_view_task(p_user_id, p_task_id)
   *
   * Logic từ database (tương tự can_user_update_task + public task)
   */
  protected async canUserViewTask(
    userId: number,
    taskId: number,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    // 1. Check user exists
    let userQuery = db.from('users').where('id', userId).whereNull('deleted_at')
    if (trx) userQuery = userQuery.useTransaction(trx)
    if (!(await userQuery.first())) return false

    // 2. Get task info
    let taskQuery = db
      .from('tasks')
      .where('id', taskId)
      .whereNull('deleted_at')
      .select('project_id', 'organization_id', 'creator_id', 'is_public_listing')
    if (trx) taskQuery = taskQuery.useTransaction(trx)
    const task = await taskQuery.first()
    if (!task) return false

    // 3. Public task → anyone can view
    if (task.is_public_listing) return true

    // 4. Check superadmin
    if (await this.isSystemSuperadmin()) return true

    // 5. Check org member
    let orgMemberQuery = db
      .from('organization_users')
      .where('user_id', userId)
      .where('organization_id', task.organization_id)
      .where('status', 'approved')
    if (trx) orgMemberQuery = orgMemberQuery.useTransaction(trx)
    if (await orgMemberQuery.first()) return true

    // 6. Check project member
    if (task.project_id) {
      let projectMemberQuery = db
        .from('project_members')
        .where('user_id', userId)
        .where('project_id', task.project_id)
      if (trx) projectMemberQuery = projectMemberQuery.useTransaction(trx)
      if (await projectMemberQuery.first()) return true
    }

    return false
  }
}
