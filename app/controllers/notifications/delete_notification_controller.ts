import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import DeleteNotification from '#actions/notifications/delete_notification'

/**
 * DELETE /notifications/:id → Delete single notification
 * DELETE /notifications → Delete all read notifications
 */
export default class DeleteNotificationController {
  async destroy(ctx: HttpContext) {
    const { params, response } = ctx
    try {
      const deleteNotification = new DeleteNotification(ExecutionContext.fromHttp(ctx))
      await deleteNotification.handle({ id: params.id as string })
      response.json({ success: true })
      return
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Thông báo không tồn tại'
      response.status(404).json({ success: false, message: errorMessage })
      return
    }
  }

  async destroyAllRead(ctx: HttpContext) {
    const { response } = ctx
    try {
      const deleteNotification = new DeleteNotification(ExecutionContext.fromHttp(ctx))
      await deleteNotification.deleteAllRead()
      response.json({ success: true })
      return
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Có lỗi xảy ra khi xóa thông báo'
      response.status(500).json({ success: false, message: errorMessage })
      return
    }
  }
}
