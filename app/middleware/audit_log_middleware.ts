import { HttpContext } from '@adonisjs/core/http'
import { NextFn } from '@adonisjs/core/types/http'
import { inject } from '@adonisjs/core'
import AuditLog from '#models/audit_log'

/**
 * Middleware tự động ghi log hoạt động người dùng
 * Sử dụng middleware này cho các route cần ghi lại hoạt động
 */
@inject()
export default class AuditLogMiddleware {
  /**
   * Xử lý request
   * @param entityType Loại entity được thao tác (user, task, app, ...)
   * @param action Hành động (view, create, update, delete, ...)
   */
  async handle(ctx: HttpContext, next: NextFn, options: { entityType: string; action: string }) {
    // Ghi thời gian bắt đầu
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
      // Ghi log lỗi nhưng không ảnh hưởng đến response
      console.error('Error logging audit:', error)
    }

    return result
  }
}
