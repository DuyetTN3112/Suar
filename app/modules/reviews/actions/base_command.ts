import type { CommandHandler } from './interfaces.js'
import { Result } from './result.js'

import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import loggerService from '#modules/logger/public_contracts/application_logger'
import type {
  ReviewTransaction,
  ReviewTransactionRunner,
} from '#modules/reviews/actions/ports/outbound/review_transaction'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'

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
  protected execCtx: ReviewActionContext

  constructor(
    execCtx: ReviewActionContext,
    private readonly transactions?: ReviewTransactionRunner
  ) {
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
    callback: (trx: ReviewTransaction) => Promise<T>
  ): Promise<T> {
    if (!this.transactions) {
      throw new InvariantViolationException('Review transaction capability is not configured')
    }
    return this.transactions.run(callback)
  }

  protected async settlePostCommitEffect(
    effectName: string,
    effect: () => Promise<void>,
    context: {
      entityId: string
      actorId: string
    }
  ): Promise<void> {
    try {
      await effect()
    } catch (error) {
      try {
        loggerService.error('Review post-commit effect failed', {
          effectName,
          committed: true,
          entityId: context.entityId,
          actorId: context.actorId,
          errorName: error instanceof Error ? error.name : 'UnknownError',
        })
      } catch {
        // Telemetry failure must never alter the result of an already committed mutation.
      }
    }
  }

  /**
   * Get current authenticated user ID
   * Throws error if userId is 0 (unauthenticated)
   */
  protected getCurrentUserId(): string {
    if (!this.execCtx.userId) {
      throw new UnauthorizedException('User must be authenticated to execute this command')
    }
    return this.execCtx.userId
  }

  /**
   * Get current organization ID from execution context
   * Throws error if not found
   */
  protected getCurrentOrganizationId(): string {
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
      return Result.fail(error)
    }
  }
}
