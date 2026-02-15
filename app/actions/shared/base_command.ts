import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { Result } from './result.js'
import type { CommandHandler } from './interfaces.js'
import PermissionService from '#services/permission_service'
import type { ExecutionContext } from '#types/execution_context'
import { ExecutionContext as ExecutionContextFactory } from '#types/execution_context'
import type { DatabaseId } from '#types/database'
import { RepositoryFactory } from '#repositories/index'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import BusinessLogicException from '#exceptions/business_logic_exception'

/**
 * Base Command Class
 * All Commands (Write operations) should extend this class
 *
 * Supports two construction modes:
 * 1. **ExecutionContext** (recommended) — decoupled from HTTP, testable
 *    ```typescript
 *    const execCtx = ExecutionContext.fromHttp(ctx)
 *    const command = new MyCommand(execCtx)
 *    ```
 * 2. **HttpContext** (legacy, backward compatible) — auto-extracts ExecutionContext
 *    ```typescript
 *    const command = new MyCommand(ctx)
 *    ```
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
export abstract class BaseCommand<TInput extends object, TOutput = void> implements CommandHandler<
  TInput,
  TOutput
> {
  /** Decoupled execution context (userId, ip, userAgent, organizationId) */
  protected execCtx: ExecutionContext

  /**
   * @deprecated Use `protected ctx: HttpContext` only for legacy code.
   * Access `this.execCtx` for userId, ip, userAgent, organizationId.
   * This property will be removed in a future refactor.
   */
  protected ctx: HttpContext

  constructor(ctxOrExec: HttpContext | ExecutionContext) {
    if ('request' in ctxOrExec) {
      // HttpContext path (legacy)
      this.ctx = ctxOrExec
      this.execCtx = ExecutionContextFactory.fromHttpOptional(ctxOrExec)
    } else {
      // ExecutionContext path (new)
      this.execCtx = ctxOrExec
      // Set ctx to a minimal stub — subclasses should migrate to execCtx
      this.ctx = ctxOrExec as unknown as HttpContext
    }
  }

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
    entityId: DatabaseId,
    oldValues?: object | null,
    newValues?: object | null
  ): Promise<void> {
    if (!this.execCtx.userId) return

    const repo = await RepositoryFactory.getAuditLogRepository()
    await repo.create({
      user_id: this.execCtx.userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      old_values: oldValues as Record<string, unknown> | null,
      new_values: newValues as Record<string, unknown> | null,
      ip_address: this.execCtx.ip,
      user_agent: this.execCtx.userAgent,
    })
  }

  /**
   * Get current authenticated user ID
   * Throws error if userId is 0 (unauthenticated)
   */
  protected getCurrentUserId(): DatabaseId {
    if (!this.execCtx.userId) {
      throw new UnauthorizedException('User must be authenticated to execute this command')
    }
    return this.execCtx.userId
  }

  /**
   * Get current authenticated user (loads from DB)
   * Throws error if user is not authenticated
   * @deprecated Prefer `getCurrentUserId()` — avoid loading full user unless needed
   */
  protected getCurrentUser() {
    const user = this.ctx.auth.user
    if (!user) {
      throw new UnauthorizedException('User must be authenticated to execute this command')
    }
    return user
  }

  /**
   * Get current organization ID from execution context
   * Throws error if not found
   */
  protected getCurrentOrganizationId(): DatabaseId {
    const organizationId = this.execCtx.organizationId
    if (!organizationId) {
      throw new BusinessLogicException('Current organization not found in session')
    }
    return organizationId
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
  // Delegate to PermissionService — centralized, stateless, testable.
  // These protected methods are kept for backward compatibility.
  // New code should use PermissionService directly.

  /**
   * Check if current user is system superadmin
   * Equivalent to: is_system_superadmin(p_user_id)
   */
  protected async isSystemSuperadmin(trx?: TransactionClientContract): Promise<boolean> {
    if (!this.execCtx.userId) return false
    return PermissionService.isSystemSuperadmin(this.execCtx.userId, trx)
  }

  /**
   * Get user's organization membership
   * Returns role_id, role_name and permissions if approved member, null otherwise
   */
  protected async getOrgMembership(
    userId: DatabaseId,
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ) {
    return PermissionService.getOrgMembership(userId, organizationId, trx)
  }

  /**
   * Get user's organization role level
   * Equivalent to: get_user_org_role_level(p_user_id, p_organization_id)
   *
   * @returns 3 = org_owner, 2 = org_admin, 1 = org_member, 0 = none
   */
  protected async getUserOrgRoleLevel(
    userId: DatabaseId,
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<number> {
    return PermissionService.getUserOrgRoleLevel(userId, organizationId, trx)
  }

  /**
   * Check if user is organization admin or owner
   * Equivalent to: is_org_admin_or_owner(p_user_id, p_organization_id)
   */
  protected async isOrgAdminOrOwner(
    userId: DatabaseId,
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    return PermissionService.isOrgAdminOrOwner(userId, organizationId, trx)
  }

  /**
   * Check organization permission
   * Equivalent to: check_organization_permission(p_user_id, p_organization_id, p_permission_name)
   */
  protected async checkOrgPermission(
    userId: DatabaseId,
    organizationId: DatabaseId,
    permission: string,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    return PermissionService.checkOrgPermission(userId, organizationId, permission, trx)
  }

  /**
   * Get user's project role level
   * Equivalent to: get_user_project_role_level(p_user_id, p_project_id)
   *
   * @returns 2 = project_owner, 1 = project_manager, 0 = none
   */
  protected async getUserProjectRoleLevel(
    userId: DatabaseId,
    projectId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<number> {
    return PermissionService.getUserProjectRoleLevel(userId, projectId, trx)
  }

  /**
   * Check if user is project manager or owner
   * Equivalent to: is_project_manager_or_owner(p_user_id, p_project_id)
   */
  protected async isProjectManagerOrOwner(
    userId: DatabaseId,
    projectId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    return PermissionService.isProjectManagerOrOwner(userId, projectId, trx)
  }

  /**
   * Check if user is organization owner
   * Equivalent to: is_org_owner(p_user_id, p_organization_id)
   */
  protected async isOrgOwner(
    userId: DatabaseId,
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    return PermissionService.isOrgOwner(userId, organizationId, trx)
  }

  /**
   * Check if user is project owner
   * Equivalent to: is_project_owner(p_user_id, p_project_id)
   */
  protected async isProjectOwner(
    userId: DatabaseId,
    projectId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    return PermissionService.isProjectOwner(userId, projectId, trx)
  }

  /**
   * Check system permission
   * Equivalent to: check_system_permission(p_user_id, p_permission_name)
   */
  protected async checkSystemPermission(
    userId: DatabaseId,
    permission: string,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    return PermissionService.checkSystemPermission(userId, permission, trx)
  }

  /**
   * Check project permission
   * Equivalent to: check_project_permission(p_user_id, p_project_id, p_permission_name)
   */
  protected async checkProjectPermission(
    userId: DatabaseId,
    projectId: DatabaseId,
    permission: string,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    return PermissionService.checkProjectPermission(userId, projectId, permission, trx)
  }

  /**
   * Check if user can update task
   * Equivalent to: can_user_update_task(p_user_id, p_task_id)
   */
  protected async canUserUpdateTask(
    userId: DatabaseId,
    taskId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    return PermissionService.canUserUpdateTask(userId, taskId, trx)
  }

  /**
   * Check if user can view task
   * Equivalent to: can_user_view_task(p_user_id, p_task_id)
   */
  protected async canUserViewTask(
    userId: DatabaseId,
    taskId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    return PermissionService.canUserViewTask(userId, taskId, trx)
  }
}
