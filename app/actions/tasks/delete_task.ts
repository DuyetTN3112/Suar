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
    try {
      // Tìm task để lưu thông tin trước khi xóa
      const task = await Task.findOrFail(id)

      // Kiểm tra quyền xóa task
      const hasPermission = await this.checkDeletePermission(user.id, task)
      if (!hasPermission) {
        return {
          success: false,
          message: 'Bạn không có quyền xóa nhiệm vụ này',
        }
      }

      // Sử dụng stored procedure để thực hiện soft delete
      await db.rawQuery('CALL soft_delete_task(?)', [id])

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
      return { success: true, message: 'Nhiệm vụ đã được xóa thành công' }
    } catch (error: any) {
      console.error('Error deleting task:', error)
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
