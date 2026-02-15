import Task from '#models/task'
import User from '#models/user'
import AuditLog from '#models/audit_log'
import type UpdateTaskStatusDTO from '../dtos/update_task_status_dto.js'
import type CreateNotification from '#actions/common/create_notification'
import type { ExecutionContext } from '#types/execution_context'
import db from '@adonisjs/lucid/services/db'
import { AuditAction, EntityType } from '#constants/audit_constants'
import CacheService from '#services/cache_service'
import emitter from '@adonisjs/core/services/emitter'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import ForbiddenException from '#exceptions/forbidden_exception'
import loggerService from '#services/logger_service'
import type { DatabaseId } from '#types/database'
import { isSameId } from '#libs/id_utils'

/**
 * Command để cập nhật trạng thái task
 *
 * Business Rules:
 * - Validate status transition (optional, có thể thêm rules)
 * - Set updated_by
 * - Notify creator nếu status thay đổi
 * - Audit log đầy đủ
 *
 * Permissions:
 * - Superadmin/Admin: Full access
 * - Creator: Có thể update
 * - Assignee: Có thể update
 * - Org Owner/Manager: Có thể update
 */
export default class UpdateTaskStatusCommand {
  constructor(
    protected execCtx: ExecutionContext,
    private createNotification: CreateNotification
  ) {}

  /**
   * Execute command để update status
   */
  async execute(dto: UpdateTaskStatusDTO): Promise<Task> {
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

      // Save old status for notification
      const oldStatusId = task.status_id

      // Validate transition (optional - có thể thêm rules)
      // const isValid = dto.validateTransition(oldStatusId, statusRules)
      // if (!isValid) {
      //   throw new BusinessLogicException('Chuyển trạng thái không hợp lệ')
      // }

      // Update status
      task.merge(dto.toObject())
      task.updated_by = String(userId)
      await task.save()

      // Create audit log
      await AuditLog.create(
        {
          user_id: userId,
          action: AuditAction.UPDATE_STATUS,
          entity_type: EntityType.TASK,
          entity_id: dto.task_id,
          old_values: { status_id: oldStatusId },
          new_values: { status_id: task.status_id },
          ip_address: this.execCtx.ip,
          user_agent: this.execCtx.userAgent,
        },
        { client: trx }
      )

      await trx.commit()

      // Emit domain event
      if (oldStatusId !== task.status_id) {
        void emitter.emit('task:status:changed', {
          task,
          oldStatusId,
          newStatusId: task.status_id,
          changedBy: userId,
        })
      }

      // Invalidate task-related caches
      await CacheService.deleteByPattern(`task:${String(dto.task_id)}:*`)
      await CacheService.deleteByPattern(`organization:tasks:*`)
      await CacheService.deleteByPattern(`task:user:*`)

      // Send notification (outside transaction)
      if (oldStatusId !== task.status_id) {
        await this.sendStatusChangeNotification(task, userId, dto)
      }

      // Load relations (batch load để tránh N+1)
      await task.load((loader) => {
        loader
          .load('status')
          .load('label')
          .load('priority')
          .load('assignee')
          .load('creator')
          .load('updater')
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
  private async validateUpdatePermission(userId: DatabaseId, task: Task): Promise<void> {
    // Load user system_role
    const user = await User.query().where('id', userId).preload('system_role').firstOrFail()

    // 1. Superadmin/Admin
    if (
      user.system_role_id !== null &&
      ['superadmin', 'admin'].includes(user.system_role.name.toLowerCase())
    ) {
      return
    }

    // 2. Creator
    if (isSameId(task.creator_id, userId)) {
      return
    }

    // 3. Assignee
    if (task.assigned_to !== null && isSameId(task.assigned_to, userId)) {
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

    throw new ForbiddenException('Bạn không có quyền cập nhật trạng thái task này')
  }

  /**
   * Send notification
   */
  private async sendStatusChangeNotification(
    task: Task,
    updaterId: DatabaseId,
    dto: UpdateTaskStatusDTO
  ): Promise<void> {
    try {
      // Don't notify if updater is creator
      if (task.creator_id && task.creator_id !== updaterId) {
        const updater = await User.find(updaterId)
        const updaterName = updater?.username ?? updater?.email ?? 'Unknown'
        await this.createNotification.handle({
          user_id: task.creator_id,
          title: 'Cập nhật trạng thái nhiệm vụ',
          message: dto.getNotificationMessage(task.title, updaterName),
          type: 'task_status_updated',
          related_entity_type: 'task',
          related_entity_id: task.id,
        })
      }
    } catch (error) {
      loggerService.error('[UpdateTaskStatusCommand] Failed to send notification', error)
    }
  }
}
