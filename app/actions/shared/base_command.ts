import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { Result } from './result.js'
import type { CommandHandler } from './interfaces.js'
import type { ExecutionContext } from '#types/execution_context'
import type { DatabaseId } from '#types/database'
import { RepositoryFactory } from '#infra/shared/repositories/index'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import BusinessLogicException from '#exceptions/business_logic_exception'

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
export abstract class BaseCommand<TInput extends object, TOutput = void> implements CommandHandler<
  TInput,
  TOutput
> {
  /** Decoupled execution context (userId, ip, userAgent, organizationId) */
  protected execCtx: ExecutionContext

  constructor(execCtx: ExecutionContext) {
    this.execCtx = execCtx
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
}
