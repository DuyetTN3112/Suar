import Task from '#models/task'
import User from '#models/user'
import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import AuditLog from '#models/audit_log'
import { DateTime } from 'luxon'
import CreateNotification from '#actions/common/create_notification'

type TaskData = {
  title: string
  description: string
  status_id: number
  label_id: number
  priority_id: number
  assigned_to?: number
  due_date: string | DateTime
  parent_task_id?: number
  estimated_time?: number
  actual_time?: number
  organization_id?: number
}

@inject()
export default class CreateTask {
  constructor(
    protected ctx: HttpContext,
    private createNotification: CreateNotification
  ) {}

  async handle({ data }: { data: TaskData }) {
    const user = this.ctx.auth.user!
    const currentOrganizationId = this.ctx.session.get('current_organization_id')

    if (!currentOrganizationId) {
      throw new Error('Không tìm thấy tổ chức hiện tại, vui lòng chọn tổ chức')
    }

    // Tạo task mới
    const task = await Task.create({
      ...data,
      creator_id: user.id,
      organization_id: Number(currentOrganizationId),
      assigned_to: data.assigned_to ? data.assigned_to : null,
      status_id: data.status_id,
      label_id: data.label_id,
      priority_id: data.priority_id,
      parent_task_id: data.parent_task_id ? data.parent_task_id : null,
      due_date: typeof data.due_date === 'string' ? DateTime.fromISO(data.due_date) : data.due_date,
      estimated_time: data.estimated_time || 0,
      actual_time: data.actual_time || 0,
    })

    // Ghi log hành động
    await AuditLog.create({
      user_id: user.id,
      action: 'create',
      entity_type: 'task',
      entity_id: task.id,
      new_values: task.toJSON(),
      ip_address: this.ctx.request.ip(),
      user_agent: this.ctx.request.header('user-agent'),
    })

    // Gửi thông báo cho người được giao task
    if (data.assigned_to) {
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

    return task
  }

  /**
   * Tạo một task mẫu cho demo
   */
  async createSampleTask(organizationId: number) {
    if (!organizationId) {
      throw new Error('Cần cung cấp organization_id')
    }

    const user = this.ctx.auth.user!
    // Kiểm tra trạng thái, nhãn và ưu tiên mặc định
    const statusId = 1 // Mới
    const labelId = 1 // Công việc
    const priorityId = 2 // Trung bình

    const task = await Task.create({
      title: 'Task mẫu demo',
      description: 'Đây là task mẫu được tạo tự động cho mục đích demo',
      status_id: statusId,
      label_id: labelId,
      priority_id: priorityId,
      assigned_to: user.id,
      creator_id: user.id,
      due_date: DateTime.local().plus({ days: 7 }), // 1 tuần sau
      estimated_time: 8,
      actual_time: 0,
      organization_id: organizationId,
    })

    return task
  }
}
