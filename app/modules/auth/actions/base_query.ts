import type { QueryHandler } from './interfaces.js'
import { Result } from './result.js'

import type { AuthActionContext } from '#modules/auth/actions/auth_action_context'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'

/**
 * Base Query Class
 * All Queries (Read operations) should extend this class
 *
 * Queries follow CQRS principles:
 * - They NEVER change system state
 * - They only return data
 * - They should be named with Get/Search/Find prefix (e.g., GetUserDetailQuery)
 * - They can be cached for performance
 *
 * Example:
 * ```typescript
 * export default class GetUsersListQuery extends BaseQuery<GetUsersListDTO, PaginatedResult<User>> {
 *   async handle(dto: GetUsersListDTO): Promise<PaginatedResult<User>> {
 *     const query = User.query()
 *     // Apply filters from dto
 *     return await query.paginate(dto.page, dto.limit)
 *   }
 * }
 * ```
 */
export abstract class BaseQuery<TInput extends object, TOutput> implements QueryHandler<
  TInput,
  TOutput
> {
  /** Decoupled execution context (userId, ip, userAgent, organizationId) */
  protected execCtx: AuthActionContext

  constructor(execCtx: AuthActionContext) {
    this.execCtx = execCtx
  }

  /**
   * Main handler method - must be implemented by subclasses
   * This is where the query logic goes
   */
  abstract handle(input: TInput): Promise<TOutput>

  /**
   * Execute query with caching
   * Use this for queries that can benefit from caching
   *
   * @param cacheKey - Unique cache key for this query
   * @param ttl - Time to live in seconds (default: 300 = 5 minutes)
   * @param callback - Function that fetches the data
   * @returns Cached or fresh data
   */
  protected async executeWithCache<T>(
    cacheKey: string,
    ttl = 300,
    callback: () => Promise<T>
  ): Promise<T> {
    const cached = await cacheStore.get<T>(cacheKey)
    if (cached !== null) {
      return cached
    }

    const data = await callback()
    await cacheStore.set(cacheKey, data, ttl)
    return data
  }

  /**
   * Generate cache key for this query
   * Override this in subclasses for custom cache key logic
   *
   * @param prefix - Cache key prefix (e.g., 'users:list')
   * @param params - Parameters to include in cache key
   * @returns Cache key string
   */
  protected generateCacheKey(prefix: string, params: Record<string, unknown>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => `${key}:${String(params[key])}`)
      .join(':')

    return `${prefix}:${sortedParams}`
  }

  /**
   * Get current authenticated user ID (if any)
   * Returns null if user is not authenticated
   */
  protected getCurrentUserId(): string | null {
    return this.execCtx.userId
  }

  /**
   * Get current organization ID from execution context (if any)
   * Returns null if not found
   */
  protected getCurrentOrganizationId(): string | null {
    return this.execCtx.organizationId
  }

  /**
   * Execute query and wrap result in Result<T>
   * Use this for queries that need explicit success/failure handling
   *
   * @param input - Query input
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
