import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import AuditLog from '#models/audit_log'

export default class AuditLogMiddleware {
  async handle(
    ctx: HttpContext,
    next: NextFn,
    options: { action?: string; entityType?: string } = {}
  ): Promise<void> {
    const startTime = Date.now()

    // Xử lý request
    await next()

    // Nếu không có người dùng đăng nhập, bỏ qua
    if (!ctx.auth.user) {
      return
    }

    // Xác định entityId từ params nếu có
    let entityId: string | number | undefined = ctx.params.id as string | undefined
    // Nếu không có entityId trong params, thử lấy từ request body
    if (entityId === undefined && ctx.request.body()) {
      entityId = ctx.request.input('id') as string | number | undefined
    }

    // Lấy thông tin request
    const { method, url: requestUrl } = ctx.request
    const ipAddress = ctx.request.ip()
    const userAgent = ctx.request.header('user-agent')

    try {
      // Ghi log vào cơ sở dữ liệu
      const methodValue = typeof method === 'function' ? method() : method
      const urlValue = typeof requestUrl === 'function' ? requestUrl() : requestUrl
      await AuditLog.create({
        user_id: ctx.auth.user.id,
        action: options.action || methodValue,
        entity_type: options.entityType,
        entity_id: entityId !== undefined ? Number(entityId) : null,
        ip_address: ipAddress,
        user_agent: userAgent,
        new_values: {
          method: methodValue,
          url: urlValue,
          duration: `${Date.now() - startTime}ms`,
          status: ctx.response.getStatus(),
        },
      })
    } catch (_error) {
      // Only log actual errors in production
      if (process.env.NODE_ENV !== 'development') {
        console.error('Error logging audit:', _error)
      }
    }

    return
  }
}
