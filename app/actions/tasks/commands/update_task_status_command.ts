import Task from '#models/task'
import User from '#models/user'
import AuditLog from '#models/audit_log'
import OrganizationUser from '#models/organization_user'
import type UpdateTaskStatusDTO from '../dtos/update_task_status_dto.js'
import type CreateNotification from '#actions/common/create_notification'
import type { ExecutionContext } from '#types/execution_context'
import db from '@adonisjs/lucid/services/db'
import { AuditAction, EntityType } from '#constants/audit_constants'
import { OrganizationRole } from '#constants/organization_constants'
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
      const oldStatus = task.status

      // Validate transition (optional - có thể thêm rules)
      // const isValid = dto.validateTransition(oldStatus, statusRules)
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
          old_values: { status: oldStatus },
          new_values: { status: task.status },
          ip_address: this.execCtx.ip,
          user_agent: this.execCtx.userAgent,
        },
        { client: trx }
      )

      await trx.commit()

      // Emit domain event
      if (oldStatus !== task.status) {
        void emitter.emit('task:status:changed', {
          task,
          oldStatus,
          newStatus: task.status,
          changedBy: userId,
        })
      }

      // Invalidate task-related caches
      await CacheService.deleteByPattern(`task:${String(dto.task_id)}:*`)
      await CacheService.deleteByPattern(`organization:tasks:*`)
      await CacheService.deleteByPattern(`task:user:*`)

      // Send notification (outside transaction)
      if (oldStatus !== task.status) {
        await this.sendStatusChangeNotification(task, userId, dto)
      }

      // Load relations (v3: status/label/priority are inline columns)
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

    // 3. Assignee
    if (task.assigned_to !== null && isSameId(task.assigned_to, userId)) {
      return
    }

    // 4. Org Owner/Admin → delegate to Model

    const orgRole = await OrganizationUser.getOrgRole(userId, task.organization_id)

    if (orgRole && [OrganizationRole.OWNER, OrganizationRole.ADMIN].includes(orgRole as OrganizationRole)) {
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
