import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import MarkNotificationAsRead from '#actions/notifications/mark_notification_as_read'
import { HttpStatus } from '#constants/error_constants'

/**
 * POST /notifications/:id/mark-as-read → Mark single notification as read
 * POST /notifications/mark-all-as-read → Mark all notifications as read
 */
export default class MarkNotificationReadController {
  async markOne(ctx: HttpContext) {
    const { params, response } = ctx
    try {
      const markAsRead = new MarkNotificationAsRead(ExecutionContext.fromHttp(ctx))
      await markAsRead.handle({ id: params.id as string })
      response.json({ success: true })
      return
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Thông báo không tồn tại'
      response.status(HttpStatus.NOT_FOUND).json({ success: false, message: errorMessage })
      return
    }
  }

  async markAll(ctx: HttpContext) {
    const { response } = ctx
    try {
      const markAsRead = new MarkNotificationAsRead(ExecutionContext.fromHttp(ctx))
      await markAsRead.markAllAsRead()
      response.json({ success: true })
      return
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Có lỗi xảy ra khi đánh dấu đã đọc'
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: errorMessage })
      return
    }
  }
}
