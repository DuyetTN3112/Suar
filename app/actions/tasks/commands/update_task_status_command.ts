import Task from '#models/task'
import User from '#models/user'
import AuditLog from '#models/audit_log'
import UpdateTaskStatusDTO from '../dtos/update_task_status_dto.js'
import CreateNotification from '#actions/common/create_notification'
import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'

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
    protected ctx: HttpContext,
    private createNotification: CreateNotification
  ) {}

  /**
   * Execute command để update status
   */
  async execute(dto: UpdateTaskStatusDTO): Promise<Task> {
    const user = this.ctx.auth.user!

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

      // Save old status for notification
      const oldStatusId = task.status_id

      // Validate transition (optional - có thể thêm rules)
      // const isValid = dto.validateTransition(oldStatusId, statusRules)
      // if (!isValid) {
      //   throw new Error('Chuyển trạng thái không hợp lệ')
      // }

      // Update status
      task.merge(dto.toObject())
      task.updated_by = user.id
      await task.save()

      // Create audit log
      await AuditLog.create(
        {
          user_id: user.id,
          action: 'update_status',
          entity_type: 'task',
          entity_id: dto.task_id,
          old_values: { status_id: oldStatusId },
          new_values: { status_id: task.status_id },
          ip_address: this.ctx.request.ip(),
          user_agent: this.ctx.request.header('user-agent'),
        },
        { client: trx }
      )

      await trx.commit()

      // Send notification (outside transaction)
      if (oldStatusId !== task.status_id) {
        await this.sendStatusChangeNotification(task, user, dto)
      }

      // Load relations
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
  private async validateUpdatePermission(user: User, task: Task): Promise<void> {
    // Load user role
    await user.load('role')

    // 1. Superadmin/Admin
    const isSuperAdmin = ['superadmin', 'admin'].includes(user.role?.name?.toLowerCase() || '')
    if (isSuperAdmin) {
      return
    }

    // 2. Creator
    if (Number(task.creator_id) === Number(user.id)) {
      return
    }

    // 3. Assignee
    if (task.assigned_to && Number(task.assigned_to) === Number(user.id)) {
      return
    }

    // 4. Org Owner/Manager
    const orgUser = await db
      .from('organization_users')
      .where('organization_id', task.organization_id)
      .where('user_id', user.id)
      .first()

    if (orgUser && [1, 2].includes(orgUser.role_id)) {
      return
    }

    throw new Error('Bạn không có quyền cập nhật trạng thái task này')
  }

  /**
   * Send notification
   */
  private async sendStatusChangeNotification(
    task: Task,
    updater: User,
    dto: UpdateTaskStatusDTO
  ): Promise<void> {
    try {
      // Don't notify if updater is creator
      if (task.creator_id && task.creator_id !== updater.id) {
        await this.createNotification.handle({
          user_id: task.creator_id,
          title: 'Cập nhật trạng thái nhiệm vụ',
          message: dto.getNotificationMessage(task.title, updater.username || updater.email),
          type: 'task_status_updated',
          related_entity_type: 'task',
          related_entity_id: task.id,
        })
      }
    } catch (error) {
      console.error('[UpdateTaskStatusCommand] Failed to send notification', error)
    }
  }
}
