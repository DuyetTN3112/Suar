import Task from '#models/task'
import User from '#models/user'
import AuditLog from '#models/audit_log'
import CreateTaskDTO from '../dtos/create_task_dto.js'
import CreateNotification from '#actions/common/create_notification'
import logger from '@adonisjs/core/services/logger'
import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'

/**
 * Command để tạo task mới
 *
 * Business Rules:
 * - organization_id là bắt buộc (từ session)
 * - creator_id tự động set từ auth.user
 * - Notification gửi cho assignee nếu task được giao
 * - Audit log đầy đủ
 * - Transaction để ensure data consistency
 *
 * Permissions:
 * - User phải đăng nhập
 * - User phải thuộc organization
 * - Có thể thêm permission check (admin/member) nếu cần
 */
export default class CreateTaskCommand {
  constructor(
    protected ctx: HttpContext,
    private createNotification: CreateNotification
  ) {}

  /**
   * Execute command để tạo task
   */
  async execute(dto: CreateTaskDTO): Promise<Task> {
    const user = this.ctx.auth.user!

    // Validate user thuộc organization
    await this.validateUserInOrganization(user.id, dto.organization_id)

    // Start transaction
    const trx = await db.transaction()

    try {
      // Create task
      const newTask = await Task.create(
        {
          title: dto.title,
          description: dto.description,
          status_id: dto.status_id,
          label_id: dto.label_id,
          priority_id: dto.priority_id,
          assigned_to: dto.assigned_to,
          due_date: dto.due_date,
          parent_task_id: dto.parent_task_id,
          estimated_time: dto.estimated_time,
          actual_time: dto.actual_time,
          project_id: dto.project_id,
          organization_id: dto.organization_id,
          creator_id: user.id,
        },
        { client: trx }
      )

      // Create audit log
      await AuditLog.create(
        {
          user_id: user.id,
          action: 'create',
          entity_type: 'task',
          entity_id: newTask.id,
          new_values: newTask.toJSON(),
          ip_address: this.ctx.request.ip(),
          user_agent: this.ctx.request.header('user-agent'),
        },
        { client: trx }
      )

      await trx.commit()

      // Send notification if task is assigned (outside transaction)
      if (dto.isAssigned()) {
        await this.sendAssignmentNotification(newTask, user, dto.assigned_to!)
      }

      // Load relations for return
      await newTask.load((loader: any) => {
        loader
          .load('status')
          .load('label')
          .load('priority')
          .load('assignee')
          .load('creator')
          .load('organization')
          .load('project')
          .load('parentTask')
      })

      return newTask
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  /**
   * Validate user thuộc organization
   */
  private async validateUserInOrganization(userId: number, organizationId: number): Promise<void> {
    const organizationUser = await db
      .from('organization_users')
      .where('organization_id', organizationId)
      .where('user_id', userId)
      .first()

    if (!organizationUser) {
      throw new Error('Bạn không thuộc tổ chức này và không thể tạo task')
    }
  }

  /**
   * Send notification cho người được giao task
   */
  private async sendAssignmentNotification(
    task: Task,
    creator: User,
    assigneeId: number
  ): Promise<void> {
    try {
      // Don't notify if assigning to self
      if (assigneeId === creator.id) {
        return
      }

      const assignee = await User.find(assigneeId)
      if (!assignee) {
        logger.warn(`[CreateTaskCommand] Assignee user not found: ${assigneeId}`)
        return
      }

      await this.createNotification.handle({
        user_id: assignee.id,
        title: 'Bạn có nhiệm vụ mới',
        message: `${creator.username || creator.email} đã giao cho bạn nhiệm vụ mới: ${task.title}`,
        type: 'task_assigned',
        related_entity_type: 'task',
        related_entity_id: task.id,
      })

      logger.info(`[CreateTaskCommand] Notification sent to user ${assigneeId} for task ${task.id}`)
    } catch (error) {
      // Don't fail task creation if notification fails
      logger.error('[CreateTaskCommand] Failed to send assignment notification', { error })
    }
  }
}
