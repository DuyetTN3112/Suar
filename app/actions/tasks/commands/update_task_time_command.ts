import Task from '#models/task'
import type User from '#models/user'
import AuditLog from '#models/audit_log'
import type UpdateTaskTimeDTO from '../dtos/update_task_time_dto.js'
import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'

/**
 * Command để cập nhật thời gian của task
 *
 * Business Rules:
 * - Update estimated_time và/hoặc actual_time
 * - Set updated_by
 * - Audit log đầy đủ
 * - Không gửi notification (có thể thêm nếu cần)
 *
 * Permissions:
 * - Superadmin/Admin: Full access
 * - Creator: Có thể update
 * - Assignee: Có thể update (đặc biệt là actual_time)
 * - Org Owner/Manager: Có thể update
 */
export default class UpdateTaskTimeCommand {
  constructor(protected ctx: HttpContext) {}

  /**
   * Execute command để update time
   */
  async execute(dto: UpdateTaskTimeDTO): Promise<Task> {
    const user = this.ctx.auth.user
    if (!user) {
      throw new Error('User must be authenticated')
    }

    // Start transaction
    const trx = await db.transaction()

    try {
      // Load task với lock
      const task = await Task.query({ client: trx })
        .where('id', dto.task_id)
        .whereNull('deleted_at')
        .forUpdate()
        .firstOrFail()

      // Check permission
      await this.validateUpdatePermission(user, task)

      // Save old values
      const oldValues = {
        estimated_time: task.estimated_time,
        actual_time: task.actual_time,
      }

      // Update time
      task.merge(dto.toObject())
      task.updated_by = user.id
      await task.save()

      // Create audit log
      await AuditLog.create(
        {
          user_id: user.id,
          action: 'update_time',
          entity_type: 'task',
          entity_id: dto.task_id,
          old_values: oldValues,
          new_values: {
            estimated_time: task.estimated_time,
            actual_time: task.actual_time,
          },
          ip_address: this.ctx.request.ip(),
          user_agent: this.ctx.request.header('user-agent'),
        },
        { client: trx }
      )

      await trx.commit()

      // Load relations
      await task.load((loader) => {
        loader.load('status').load('assignee').load('creator').load('updater')
      })

      return task
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  /**
   * Validate permission
   */
  private async validateUpdatePermission(user: User, task: Task): Promise<void> {
    // Load user role
    await user.load('system_role')

    // 1. Superadmin/Admin
    const systemRole = user.$preloaded.system_role as typeof user.system_role | undefined
    if (
      systemRole !== undefined &&
      ['superadmin', 'admin'].includes(systemRole.name.toLowerCase())
    ) {
      return
    }

    // 2. Creator
    if (task.creator_id === user.id) {
      return
    }

    // 3. Assignee (especially for actual_time)
    if (task.assigned_to === user.id) {
      return
    }

    // 4. Org Owner/Manager
    const orgUser = (await db
      .from('organization_users')
      .where('organization_id', task.organization_id)
      .where('user_id', user.id)
      .first()) as { role_id: number } | null

    if (orgUser && [1, 2].includes(orgUser.role_id)) {
      return
    }

    throw new Error('Bạn không có quyền cập nhật thời gian task này')
  }
}
