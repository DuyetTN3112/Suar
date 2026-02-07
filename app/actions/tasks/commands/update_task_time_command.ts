import Task from '#models/task'
import User from '#models/user'
import AuditLog from '#models/audit_log'
import type UpdateTaskTimeDTO from '../dtos/update_task_time_dto.js'
import type { ExecutionContext } from '#types/execution_context'
import db from '@adonisjs/lucid/services/db'
import { AuditAction, EntityType } from '#constants/audit_constants'
import CacheService from '#services/cache_service'

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
  constructor(protected execCtx: ExecutionContext) {}

  /**
   * Execute command để update time
   */
  async execute(dto: UpdateTaskTimeDTO): Promise<Task> {
    const userId = this.execCtx.userId
    if (!userId) {
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
      await this.validateUpdatePermission(userId, task)

      // Save old values
      const oldValues = {
        estimated_time: task.estimated_time,
        actual_time: task.actual_time,
      }

      // Update time
      task.merge(dto.toObject())
      task.updated_by = userId
      await task.save()

      // Create audit log
      await AuditLog.create(
        {
          user_id: userId,
          action: AuditAction.UPDATE_TIME,
          entity_type: EntityType.TASK,
          entity_id: dto.task_id,
          old_values: oldValues,
          new_values: {
            estimated_time: task.estimated_time,
            actual_time: task.actual_time,
          },
          ip_address: this.execCtx.ip,
          user_agent: this.execCtx.userAgent,
        },
        { client: trx }
      )

      await trx.commit()

      // Invalidate task cache
      await CacheService.deleteByPattern(`task:${String(dto.task_id)}:*`)

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
  private async validateUpdatePermission(userId: number, task: Task): Promise<void> {
    // Load user role
    const user = await User.query().where('id', userId).preload('system_role').firstOrFail()

    // 1. Superadmin/Admin
    if (
      user.system_role !== undefined &&
      ['superadmin', 'admin'].includes(user.system_role.name.toLowerCase())
    ) {
      return
    }

    // 2. Creator
    if (task.creator_id === userId) {
      return
    }

    // 3. Assignee (especially for actual_time)
    if (task.assigned_to === userId) {
      return
    }

    // 4. Org Owner/Manager
    const orgUser = (await db
      .from('organization_users')
      .where('organization_id', task.organization_id)
      .where('user_id', userId)
      .first()) as { role_id: number } | null

    if (orgUser && [1, 2].includes(orgUser.role_id)) {
      return
    }

    throw new Error('Bạn không có quyền cập nhật thời gian task này')
  }
}
