import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import emitter from '@adonisjs/core/services/emitter'
import loggerService from '#services/logger_service'

/**
 * Audit Log Middleware — Emit audit:log event sau khi request hoàn thành.
 *
 * TRƯỚC: Ghi trực tiếp qua AuditLog.create() — coupling cao, triple audit path
 * SAU: Emit event → AuditLogListener xử lý (Repository Pattern, DualWrite)
 *
 * SINGLE AUDIT PATH: Event-driven only
 *   middleware → emit('audit:log') → AuditLogListener → RepositoryFactory
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

    const entityId = ctx.params.id as string | undefined
    const duration = Date.now() - startTime

    // Fire-and-forget: emit event → AuditLogListener handles persistence
    try {
      void emitter.emit('audit:log', {
        userId: ctx.auth.user.id,
        action: options.action ?? ctx.request.method(),
        entityType: options.entityType ?? undefined,
        entityId: entityId ?? undefined,
        ipAddress: ctx.request.ip(),
        userAgent: ctx.request.header('user-agent') ?? '',
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
        userId: ctx.auth.user?.id,
        url: ctx.request.url(),
      })
    }
  }
}
