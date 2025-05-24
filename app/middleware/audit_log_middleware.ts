import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import AuditLog from '#models/audit_log'

export default class AuditLogMiddleware {
  async handle(
    ctx: HttpContext,
    next: NextFn,
    options: { action?: string; entityType?: string } = {}
  ) {
    const startTime = Date.now()

    // Xử lý request
    const result = await next()

    // Nếu không có người dùng đăng nhập, bỏ qua
    if (!ctx.auth.user) {
      return result
    }

    // Xác định entityId từ params nếu có
    let entityId = ctx.params.id
    // Nếu không có entityId trong params, thử lấy từ request body
    if (!entityId && ctx.request.body()) {
      entityId = ctx.request.input('id')
    }

    // Lấy thông tin request
    const { method, url } = ctx.request
    const ipAddress = ctx.request.ip()
    const userAgent = ctx.request.header('user-agent')

    try {
      // Ghi log vào cơ sở dữ liệu
      await AuditLog.create({
        user_id: ctx.auth.user.id,
        action: options.action || (typeof method === 'function' ? method() : method),
        entity_type: options.entityType,
        entity_id: entityId ? Number(entityId) : null,
        ip_address: ipAddress,
        user_agent: userAgent,
        new_values: {
          method,
          url,
          duration: `${Date.now() - startTime}ms`,
          status: ctx.response.getStatus(),
        },
      })
    } catch (error) {
      // Only log actual errors in production
      if (process.env.NODE_ENV !== 'development') {
        console.error('Error logging audit:', error)
      }
    }

    return result
  }
}
