import type { HttpContext } from '@adonisjs/core/http'

/**
 * ExecutionContext — Decoupled context for Commands and Queries
 *
 * This interface decouples business logic from HTTP-specific concerns.
 * Commands/Queries receive only the data they need, not the full HttpContext.
 *
 * Benefits:
 * - Testable: Easy to mock, no need for full HttpContext in tests
 * - Reusable: Commands can be called from CLI, WebSocket, queue workers, etc.
 * - Explicit: Clear contract of what context data is required
 * - Type-safe: No more `this.ctx.auth.user?.id ?? 0` defensive coding
 *
 * @example Controller usage:
 * ```typescript
 * async store(ctx: HttpContext) {
 *   const execCtx = ExecutionContext.fromHttp(ctx)
 *   const command = new CreateTaskCommand(execCtx)
 *   await command.execute(dto)
 * }
 * ```
 *
 * @example Test usage:
 * ```typescript
 * const execCtx: ExecutionContext = {
 *   userId: 1,
 *   ip: '127.0.0.1',
 *   userAgent: 'test',
 *   organizationId: 10,
 * }
 * const command = new CreateTaskCommand(execCtx)
 * await command.execute(dto)
 * ```
 */
export interface ExecutionContext {
  /** Authenticated user ID. Always present for authenticated routes. */
  readonly userId: number

  /** Client IP address, for audit logging. */
  readonly ip: string

  /** User-Agent header, for audit logging. */
  readonly userAgent: string

  /** Current organization ID from session. Null if not selected yet. */
  readonly organizationId: number | null
}

/**
 * Factory & helper namespace for ExecutionContext
 */
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace ExecutionContext {
  /**
   * Create ExecutionContext from an AdonisJS HttpContext.
   * Throws if user is not authenticated.
   *
   * @param ctx - AdonisJS HttpContext (from controller method parameter)
   * @returns ExecutionContext with extracted values
   * @throws Error if user is not authenticated
   */
  export function fromHttp(ctx: HttpContext): ExecutionContext {
    const user = ctx.auth.user
    if (!user) {
      throw new Error('User must be authenticated')
    }

    return {
      userId: user.id,
      ip: ctx.request.ip(),
      userAgent: ctx.request.header('user-agent') ?? '',
      organizationId: (ctx.session.get('current_organization_id') as number | undefined) ?? null,
    }
  }

  /**
   * Create ExecutionContext from an AdonisJS HttpContext, allowing unauthenticated.
   * Returns null userId if user is not authenticated.
   * Use for public endpoints that may or may not have auth.
   */
  export function fromHttpOptional(ctx: HttpContext): ExecutionContext {
    return {
      userId: ctx.auth.user?.id ?? 0,
      ip: ctx.request.ip(),
      userAgent: ctx.request.header('user-agent') ?? '',
      organizationId: (ctx.session.get('current_organization_id') as number | undefined) ?? null,
    }
  }

  /**
   * Create ExecutionContext for system/internal operations (queue jobs, CLI, etc.)
   * Uses a system user ID and no HTTP-specific data.
   *
   * @param systemUserId - The system/service account user ID
   */
  export function system(systemUserId: number): ExecutionContext {
    return {
      userId: systemUserId,
      ip: '0.0.0.0',
      userAgent: 'system',
      organizationId: null,
    }
  }
}
