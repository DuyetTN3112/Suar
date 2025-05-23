import Task from '#models/task'
import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import AuditLog from '#models/audit_log'
import { DateTime } from 'luxon'
import User from '#models/user'
import db from '@adonisjs/lucid/services/db'
import CreateNotification from '#actions/common/create_notification'

@inject()
export default class DeleteTask {
  constructor(
    protected ctx: HttpContext,
    private createNotification: CreateNotification
  ) {}

  async handle({ id }: { id: number }) {
    const user = this.ctx.auth.user!
    console.log(
      `[DeleteTask] Bắt đầu xóa task ID: ${id}, người dùng: ${user.id} (${user.username})`
    )

    try {
      // Tìm task để lưu thông tin trước khi xóa
      const task = await Task.findOrFail(id)
      console.log(`[DeleteTask] Đã tìm thấy task: ${task.id} - ${task.title}`)

      // Kiểm tra quyền xóa task
      const hasPermission = await this.checkDeletePermission(user.id, task)
      console.log(`[DeleteTask] Người dùng có quyền xóa: ${hasPermission}`)
      if (!hasPermission) {
        console.log(`[DeleteTask] Từ chối quyền xóa task cho người dùng ${user.id}`)
        return {
          success: false,
          message: 'Bạn không có quyền xóa nhiệm vụ này',
        }
      }

      // Cập nhật trực tiếp trường deleted_at thay vì gọi stored procedure
      const now = DateTime.now().toSQL({ includeOffset: false })
      console.log(`[DeleteTask] Đang xóa task với timestamp: ${now}`)
      const updatedRows = await Task.query().where('id', id).update({ deleted_at: now })
      console.log(`[DeleteTask] Số hàng đã cập nhật: ${updatedRows}`)
      // Kiểm tra xem task đã thực sự bị xóa chưa
      const checkAfterDelete = await Task.query().where('id', id).first()
      console.log(
        `[DeleteTask] Kiểm tra sau khi xóa:`,
        checkAfterDelete
          ? `Task còn tồn tại, deleted_at: ${checkAfterDelete.deleted_at}`
          : 'Không tìm thấy task (có thể đã bị xóa hoàn toàn)',
        'Không tìm thấy task (có thể đã bị xóa hoàn toàn)'
      )

      // Ghi log hành động
      await AuditLog.create({
        user_id: user.id,
        action: 'delete',
        entity_type: 'task',
        entity_id: id,
        old_values: task.toJSON(),
        ip_address: this.ctx.request.ip(),
        user_agent: this.ctx.request.header('user-agent'),
      })
      console.log(`[DeleteTask] Đã ghi log audit`)
      // Gửi thông báo cho người được giao task và người tạo
      if (task.assigned_to && task.assigned_to !== user.id) {
        await this.createNotification.handle({
          user_id: task.assigned_to,
          title: 'Nhiệm vụ đã bị xóa',
          message: `${user.full_name} đã xóa nhiệm vụ: ${task.title}`,
          type: 'task_deleted',
          related_entity_type: 'task',
          related_entity_id: id,
        })
      }
      if (task.creator_id && task.creator_id !== user.id) {
        await this.createNotification.handle({
          user_id: task.creator_id,
          title: 'Nhiệm vụ đã bị xóa',
          message: `${user.full_name} đã xóa nhiệm vụ: ${task.title}`,
          type: 'task_deleted',
          related_entity_type: 'task',
          related_entity_id: id,
        })
      }
      console.log(`[DeleteTask] Xóa task hoàn tất thành công`)
      return { success: true, message: 'Nhiệm vụ đã được xóa thành công' }
    } catch (error: any) {
      console.error('[DeleteTask] Lỗi khi xóa task:', error)
      return {
        success: false,
        message: error.message || 'Có lỗi khi xóa nhiệm vụ',
      }
    }
  }
  /**
   * Kiểm tra quyền xóa task
   */
  private async checkDeletePermission(userId: number, task: Task): Promise<boolean> {
    // Lấy thông tin người dùng và tổ chức
    const user = await User.findOrFail(userId)
    await user.load('role')
    // Kiểm tra tổ chức của task
    const taskOrgId = task.organization_id
    // Nếu là superadmin hoặc admin thì kiểm tra xem họ có thuộc tổ chức của task không
    if (['superadmin', 'admin'].includes(user.role.name.toLowerCase())) {
      // Nếu task không thuộc tổ chức nào
      if (!taskOrgId) {
        return true // Admin/superadmin có thể xóa task không thuộc tổ chức nào
      }
      // Kiểm tra xem admin/superadmin có thuộc tổ chức của task không
      const adminInOrg = await db
        .from('organization_users')
        .where('organization_id', taskOrgId)
        .where('user_id', userId)
        .first()

      if (adminInOrg) {
        return true // Admin/superadmin thuộc tổ chức có quyền xóa
      }
    }

    // Kiểm tra người tạo task
    if (task.creator_id === userId) {
      // Người tạo task có quyền xóa
      return true
    }

    // Kiểm tra quyền trong tổ chức
    if (taskOrgId) {
      const organizationUser = await db
        .from('organization_users')
        .where('organization_id', taskOrgId)
        .where('user_id', userId)
        .first()

      // role_id 1: owner, 2: admin của tổ chức
      if (organizationUser && [1, 2].includes(Number(organizationUser.role_id))) {
        return true
      }
    }

    return false
  }
}
