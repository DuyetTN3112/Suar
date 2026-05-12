import type { CommandHandler } from '../../interfaces.js'

import type { AdminActionContext } from '#modules/admin/users/actions/action_context'
import AppException from '#modules/errors/public_contracts/application_exception'
import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import { Result } from '#modules/errors/public_contracts/result'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'

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
 *     return this.registration.register(dto)
 *   }
 * }
 * ```
 */
export abstract class BaseCommand<TInput extends object, TOutput = void> implements CommandHandler<
  TInput,
  TOutput
> {
  /** Decoupled execution context (userId, ip, userAgent, organizationId) */
  protected execCtx: AdminActionContext

  constructor(execCtx: AdminActionContext) {
    this.execCtx = execCtx
  }

  /**
   * Main handler method - must be implemented by subclasses
   * This is where the command logic goes
   */
  abstract handle(input: TInput): Promise<TOutput>

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
  async executeAndWrap(input: TInput): Promise<Result<TOutput, AppException>> {
    try {
      const result = await this.handle(input)
      return Result.ok(result)
    } catch (error) {
      if (error instanceof AppException) {
        return Result.fail(error)
      }

      throw error
    }
  }
}
