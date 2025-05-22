import Task from '#models/task'
import User from '#models/user'
import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import AuditLog from '#models/audit_log'
import { DateTime } from 'luxon'
import CreateNotification from '#actions/common/create_notification'
import db from '@adonisjs/lucid/services/db'

type TaskData = {
  title?: string
  description?: string
  status_id?: number
  label_id?: number
  priority_id?: number
  assigned_to?: number
  due_date?: string | DateTime
  parent_task_id?: number
  estimated_time?: number
  actual_time?: number
  organization_id?: number
}

@inject()
export default class UpdateTask {
  constructor(
    protected ctx: HttpContext,
    private createNotification: CreateNotification
  ) {}

  async handle({ id, data }: { id: number; data: TaskData }) {
    const user = this.ctx.auth.user!

    // Lấy dữ liệu cũ của task
    const task = await Task.findOrFail(id)
    // Kiểm tra task thuộc tổ chức hiện tại
    const currentOrganizationId = this.ctx.session.get('current_organization_id')
    if (Number(task.organization_id) !== Number(currentOrganizationId)) {
      throw new Error('Bạn không có quyền cập nhật task này')
    }
    // Kiểm tra quyền cập nhật
    const canUpdate = await this.checkUpdatePermission(user.id, task)
    if (!canUpdate) {
      throw new Error('Bạn không có quyền cập nhật task này')
    }

    const oldData = JSON.stringify(task.toJSON())
    const oldAssignedTo = task.assigned_to

    // Xử lý dữ liệu trước khi cập nhật
    const updateData: Record<string, any> = {}
    if (data.title) updateData.title = data.title
    if (data.description) updateData.description = data.description
    if (data.status_id) updateData.status_id = data.status_id
    if (data.label_id) updateData.label_id = data.label_id
    if (data.priority_id) updateData.priority_id = data.priority_id
    if (data.assigned_to !== undefined) updateData.assigned_to = data.assigned_to
    if (data.parent_task_id !== undefined)
      updateData.parent_task_id = data.parent_task_id === 0 ? null : data.parent_task_id
    if (data.estimated_time !== undefined) updateData.estimated_time = data.estimated_time
    if (data.actual_time !== undefined) updateData.actual_time = data.actual_time
    // Cập nhật dueDate nếu có
    if (data.due_date) {
      updateData.due_date =
        typeof data.due_date === 'string' ? DateTime.fromISO(data.due_date) : data.due_date
    }

    // Cập nhật task
    task.merge(updateData)
    await task.save()

    // Ghi log hành động
    await AuditLog.create({
      user_id: user.id,
      action: 'update',
      entity_type: 'task',
      entity_id: task.id,
      old_values: JSON.parse(oldData),
      new_values: task.toJSON(),
      ip_address: this.ctx.request.ip(),
      user_agent: this.ctx.request.header('user-agent'),
    })

    // Nếu người được giao việc thay đổi, gửi thông báo
    if (data.assigned_to && data.assigned_to !== oldAssignedTo) {
      const assignee = await User.find(data.assigned_to)

      if (assignee) {
        await this.createNotification.handle({
          user_id: assignee.id,
          title: 'Bạn có nhiệm vụ mới',
          message: `${user.full_name} đã giao cho bạn nhiệm vụ: ${task.title}`,
          type: 'task_assigned',
          related_entity_type: 'task',
          related_entity_id: task.id,
        })
      }
    }

    // Nếu trạng thái thay đổi, thông báo cho người tạo
    if (data.status_id && data.status_id !== task.$original.status_id) {
      // Tìm người tạo
      if (task.creator_id !== user.id) {
        await this.createNotification.handle({
          user_id: task.creator_id,
          title: 'Cập nhật nhiệm vụ',
          message: `${user.full_name} đã cập nhật trạng thái nhiệm vụ: ${task.title}`,
          type: 'task_status_updated',
          related_entity_type: 'task',
          related_entity_id: task.id,
        })
      }
    }

    return task
  }

  /**
   * Kiểm tra quyền cập nhật task
   */
  private async checkUpdatePermission(userId: number, task: Task): Promise<boolean> {
    // Người tạo hoặc người được giao task luôn có quyền cập nhật
    if (Number(task.creator_id) === Number(userId) || Number(task.assigned_to) === Number(userId)) {
      return true
    }

    // Kiểm tra vai trò trong hệ thống
    const user = await User.findOrFail(userId)
    await user.load('role')
    if (['superadmin', 'admin'].includes(user.role.name.toLowerCase())) {
      return true
    }

    // Kiểm tra vai trò trong tổ chức
    const organizationUser = await db
      .from('organization_users')
      .where('organization_id', task.organization_id)
      .where('user_id', userId)
      .first()

    if (organizationUser && [1, 2].includes(organizationUser.role_id)) {
      return true
    }

    return false
  }
}
