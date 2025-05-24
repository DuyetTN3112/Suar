import { HttpContext } from '@adonisjs/core/http'
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
export abstract class BaseCommand<TInput, TOutput = void>
  implements CommandHandler<TInput, TOutput>
{
  constructor(protected ctx: HttpContext) {}

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
    oldValues?: any,
    newValues?: any
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
}
