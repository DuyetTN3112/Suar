import type { HttpContext } from '@adonisjs/core/http'
import emitter from '@adonisjs/core/services/emitter'
import type { NextFn } from '@adonisjs/core/types/http'

import type { AuditLogEvent } from '#modules/audit/events/audit_events'
import {
  sanitizeErrorText,
  sanitizeRequestUrl,
} from '#modules/errors/public_contracts/error_sanitization'
import loggerService from '#modules/logger/public_contracts/application_logger'

const DEFAULT_AUDIT_EMISSION_TIMEOUT_MS = 1_000

export interface AuditLogMiddlewareDependencies {
  emit(event: AuditLogEvent): Promise<void>
  logger: Pick<typeof loggerService, 'error'>
  now(): number
  timeoutMs: number
}

const defaultDependencies: AuditLogMiddlewareDependencies = {
  emit: (event) => emitter.emit('audit:log', event),
  logger: loggerService,
  now: Date.now,
  timeoutMs: DEFAULT_AUDIT_EMISSION_TIMEOUT_MS,
}

/**
 * Audit Log Middleware — Emit audit:log event sau khi request hoàn thành.
 *
 * TRƯỚC: Ghi trực tiếp qua AuditLog.create() — coupling cao, triple audit path
 * SAU: Emit event → AuditLogListener xử lý (Repository Pattern, DualWrite)
 *
 * SINGLE AUDIT PATH: Event-driven only
 *   middleware → emit('audit:log') → AuditLogListener → auditRepositoryProvider
 *
 * Pattern: bounded best-effort emission after downstream completion.
 */
export default class AuditLogMiddleware {
  private readonly dependencies: AuditLogMiddlewareDependencies

  constructor(dependencies: Partial<AuditLogMiddlewareDependencies> = {}) {
    this.dependencies = { ...defaultDependencies, ...dependencies }
    if (
      !Number.isSafeInteger(this.dependencies.timeoutMs) ||
      this.dependencies.timeoutMs < 10 ||
      this.dependencies.timeoutMs > 10_000
    ) {
      throw new RangeError('Audit middleware timeout must be between 10 and 10000 milliseconds')
    }
  }

  async handle(
    ctx: HttpContext,
    next: NextFn,
    options: { action?: string; entityType?: string } = {}
  ): Promise<void> {
    const startTime = this.dependencies.now()

    await next()

    let userId: string | null = null
    let requestUrl: string | null = null
    try {
      const authenticatedUser = ctx.auth.user
      if (!authenticatedUser) {
        return
      }
      userId = sanitizeErrorText(authenticatedUser.id, 128)
      const method = sanitizeErrorText(ctx.request.method(), 16)
      requestUrl = sanitizeRequestUrl(ctx.request.url())
      const entityId = this.resolveEntityId(ctx.params)
      const duration = Math.max(0, this.dependencies.now() - startTime)
      const event: AuditLogEvent = {
        userId,
        action: sanitizeErrorText(options.action ?? method, 128),
        ipAddress: sanitizeErrorText(ctx.request.ip(), 64),
        userAgent: sanitizeErrorText(ctx.request.header('user-agent') ?? '', 512),
        ...(options.entityType !== undefined
          ? { entityType: sanitizeErrorText(options.entityType, 128) }
          : {}),
        ...(entityId !== undefined ? { entityId } : {}),
        newValues: {
          method,
          url: requestUrl,
          duration: `${String(duration)}ms`,
          status: ctx.response.getStatus(),
        },
      }

      const outcome = await this.emitWithDeadline(event)
      if (outcome.kind === 'completed') {
        return
      }
      this.logFailureSafely({
        failureKind: outcome.kind,
        errorName:
          outcome.kind === 'failed' && outcome.error instanceof Error
            ? outcome.error.name
            : 'AuditEmissionTimeout',
        userId,
        url: requestUrl,
      })
    } catch (error) {
      // Every audit preparation/emission failure is best-effort at this
      // middleware boundary and must never replace the completed response.
      this.logFailureSafely({
        failureKind: 'preparation',
        errorName: error instanceof Error ? error.name : 'UnknownError',
        userId,
        url: requestUrl,
      })
    }
  }

  private logFailureSafely(payload: Record<string, unknown>): void {
    try {
      this.dependencies.logger.error('Audit log emit failed', payload)
    } catch {
      // Recursive telemetry failure cannot change the completed response.
    }
  }

  private async emitWithDeadline(
    event: AuditLogEvent
  ): Promise<{ kind: 'completed' } | { kind: 'failed'; error: unknown } | { kind: 'timed_out' }> {
    let timeout: ReturnType<typeof setTimeout> | undefined
    const emission = this.dependencies.emit(event).then(
      () => ({ kind: 'completed' }) as const,
      (error: unknown) => ({ kind: 'failed', error }) as const
    )
    const deadline = new Promise<{ kind: 'timed_out' }>((resolve) => {
      timeout = setTimeout(() => resolve({ kind: 'timed_out' }), this.dependencies.timeoutMs)
    })

    try {
      return await Promise.race([emission, deadline])
    } finally {
      if (timeout !== undefined) {
        clearTimeout(timeout)
      }
    }
  }

  private resolveEntityId(params: HttpContext['params']): string | undefined {
    const routeParams = params as Record<string, unknown>
    const exactId = routeParams['id']
    if (typeof exactId === 'string' && exactId.length > 0) {
      return sanitizeErrorText(exactId, 256)
    }

    for (const [key, value] of Object.entries(routeParams)) {
      if (!key.endsWith('Id')) {
        continue
      }

      if (typeof value === 'string' && value.length > 0) {
        return sanitizeErrorText(value, 256)
      }
    }

    return undefined
  }
}
