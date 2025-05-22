import Task from '#models/task'
import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import AuditLog from '#models/audit_log'

@inject()
export default class UpdateTaskTime {
  constructor(protected ctx: HttpContext) {}

  async handle({ id, actualTime }: { id: number; actualTime: number }) {
    const user = this.ctx.auth.user!

    // Lấy task cần cập nhật
    const task = await Task.findOrFail(id)
    const oldData = JSON.stringify(task.toJSON())

    // Cập nhật thời gian thực tế
    task.actual_time = actualTime
    await task.save()

    // Ghi log hành động
    await AuditLog.create({
      user_id: user.id,
      action: 'update_time',
      entity_type: 'task',
      entity_id: task.id,
      old_values: JSON.parse(oldData),
      new_values: task.toJSON(),
      ip_address: this.ctx.request.ip(),
      user_agent: this.ctx.request.header('user-agent'),
    })

    return task
  }
}
