import type { HttpContext } from '@adonisjs/core/http'
import emitter from '@adonisjs/core/services/emitter'
import type { NextFn } from '@adonisjs/core/types/http'

import loggerService from '#modules/logger/public_contracts/logger_service'

/**
 * Audit Log Middleware — Emit audit:log event sau khi request hoàn thành.
 *
 * TRƯỚC: Ghi trực tiếp qua AuditLog.create() — coupling cao, triple audit path
 * SAU: Emit event → AuditLogListener xử lý (Repository Pattern, DualWrite)
 *
 * SINGLE AUDIT PATH: Event-driven only
 *   middleware → emit('audit:log') → AuditLogListener → auditRepositoryProvider
 *
 * Pattern: Fire-and-forget, non-blocking
 */
export default class AuditLogMiddleware {
  async handle(
    ctx: HttpContext,
    next: NextFn,
    options: { action?: string; entityType?: string } = {}
  ): Promise<void> {
    const startTime = Date.now()

    await next()

    if (!ctx.auth.user) {
      return
    }

    const entityId = this.resolveEntityId(ctx.params)
    const duration = Date.now() - startTime

    // Fire-and-forget: emit event → AuditLogListener handles persistence
    try {
      void emitter.emit('audit:log', {
        userId: ctx.auth.user.id,
        action: options.action ?? ctx.request.method(),
        ipAddress: ctx.request.ip(),
        userAgent: ctx.request.header('user-agent') ?? '',
        ...(options.entityType !== undefined ? { entityType: options.entityType } : {}),
        ...(entityId !== undefined ? { entityId } : {}),
        newValues: {
          method: ctx.request.method(),
          url: ctx.request.url(),
          duration: `${String(duration)}ms`,
          status: ctx.response.getStatus(),
        },
      })
    } catch (error) {
      // Audit failure KHÔNG block response
      loggerService.error('Audit log emit failed', {
        error: error instanceof Error ? error.message : String(error),
        userId: ctx.auth.user.id,
        url: ctx.request.url(),
      })
    }
  }

  private resolveEntityId(params: HttpContext['params']): string | undefined {
    const routeParams = params as Record<string, unknown>
    const exactId = routeParams['id']
    if (typeof exactId === 'string' && exactId.length > 0) {
      return exactId
    }

    for (const [key, value] of Object.entries(routeParams)) {
      if (!key.endsWith('Id')) {
        continue
      }

      if (typeof value === 'string' && value.length > 0) {
        return value
      }
    }

    return undefined
  }
}
