import Task from '#models/task'
import User from '#models/user'
import AuditLog from '#models/audit_log'
import OrganizationUser from '#models/organization_user'
import type UpdateTaskTimeDTO from '../dtos/update_task_time_dto.js'
import type { ExecutionContext } from '#types/execution_context'
import db from '@adonisjs/lucid/services/db'
import { AuditAction, EntityType } from '#constants/audit_constants'
import { OrganizationRole } from '#constants/organization_constants'
import CacheService from '#services/cache_service'
import emitter from '@adonisjs/core/services/emitter'
import type { DatabaseId } from '#types/database'
import { isSameId } from '#libs/id_utils'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import ForbiddenException from '#exceptions/forbidden_exception'

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
      throw new UnauthorizedException()
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
      task.updated_by = String(userId)
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

      // Emit domain event
      void emitter.emit('task:updated', {
        task,
        updatedBy: userId,
        changes: {
          estimated_time: task.estimated_time,
          actual_time: task.actual_time,
        },
        previousValues: oldValues,
      })

      // Load relations
      await task.load((loader) => {
        loader.load('assignee').load('creator').load('updater')
      })

      return task
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  /**
   * Validate permission → delegate to Model
   */
  private async validateUpdatePermission(userId: DatabaseId, task: Task): Promise<void> {
    // 1. Superadmin/Admin → delegate to Model
    const isSystemAdmin = await User.isSystemAdmin(userId)
    if (isSystemAdmin) {
      return
    }

    // 2. Creator
    if (isSameId(task.creator_id, userId)) {
      return
    }

    // 3. Assignee (especially for actual_time)
    if (task.assigned_to !== null && isSameId(task.assigned_to, userId)) {
      return
    }

    // 4. Org Owner/Admin → delegate to Model
    const orgRole = await OrganizationUser.getOrgRole(userId, task.organization_id)

    if (orgRole && [OrganizationRole.OWNER, OrganizationRole.ADMIN].includes(String(orgRole) as OrganizationRole)) {
      return
    }

    throw new ForbiddenException('Bạn không có quyền cập nhật thời gian task này')
  }
}
