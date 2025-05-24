import Task from '#models/task'
import User from '#models/user'
import AuditLog from '#models/audit_log'
import db from '@adonisjs/lucid/services/db'
import AssignTaskDTO from '../dtos/assign_task_dto.js'
import CreateNotification from '#actions/common/create_notification'
import type { HttpContext } from '@adonisjs/core/http'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

/**
 * Command để giao task cho người dùng
 *
 * Business Rules:
 * - Assign: Giao task cho user
 * - Reassign: Chuyển task từ user cũ sang user mới
 * - Unassign: Bỏ giao việc (set assigned_to = null)
 * - User phải thuộc cùng organization
 * - Notification gửi cho assignee mới (và có thể old assignee)
 * - Audit log đầy đủ
 *
 * Permissions:
 * - Superadmin/Admin: Full access
 * - Creator: Có thể assign/reassign
 * - Current Assignee: Có thể unassign hoặc reassign
 * - Org Owner/Manager: Có thể assign tasks trong org
 */
export default class AssignTaskCommand {
  constructor(
    protected ctx: HttpContext,
    private createNotification: CreateNotification
  ) {}

  /**
   * Execute command để assign task
   */
  async execute(dto: AssignTaskDTO): Promise<Task> {
    const user = this.ctx.auth.user!

    // Start transaction
    const trx = await db.transaction()

    try {
      // Load task với lock
      const existingTask = await Task.query({ client: trx })
        .where('id', dto.task_id)
        .whereNull('deleted_at')
        .forUpdate()
        .firstOrFail()

      // Check permission
      await this.validateAssignPermission(user, existingTask, trx)

      // If assigning (not unassigning), validate assignee
      if (dto.isAssigning()) {
        await this.validateAssignee(dto.assigned_to!, existingTask.organization_id, trx)
      }

      // Save old value for audit
      const oldAssignedTo = existingTask.assigned_to
      const oldValues = existingTask.toJSON()

      // Update assignment
      existingTask.assigned_to = dto.assigned_to
      existingTask.updated_by = user.id
      await existingTask.useTransaction(trx).save()

      // Create audit log
      await AuditLog.create(
        {
          user_id: user.id,
          action: dto.isUnassigning() ? 'unassign' : 'assign',
          entity_type: 'task',
          entity_id: dto.task_id,
          old_values: oldValues,
          new_values: existingTask.toJSON(),
          ip_address: this.ctx.request.ip(),
          user_agent: this.ctx.request.header('user-agent') || '',
        },
        { client: trx }
      )

      // Commit transaction
      await trx.commit()

      // Store old value for notifications (after commit)
      existingTask.$extras.oldAssignedTo = oldAssignedTo

      // Send notifications (outside transaction)
      if (dto.shouldNotify()) {
        await this.sendAssignmentNotifications(existingTask, user, dto)
      }

      // Load relations
      await existingTask.load((loader) => {
        loader
          .load('status')
          .load('label')
          .load('priority')
          .load('assignee')
          .load('creator')
          .load('updater')
          .load('organization')
      })

      return existingTask
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  /**
   * Validate permission để assign task
   */
  private async validateAssignPermission(
    user: User,
    task: Task,
    trx: TransactionClientContract
  ): Promise<void> {
    // Load user role
    await user.load('role')

    // 1. Superadmin/Admin have full access
    const isSuperAdmin = ['superadmin', 'admin'].includes(user.role?.name?.toLowerCase() || '')
    if (isSuperAdmin) {
      return
    }

    // 2. Creator can assign
    if (Number(task.creator_id) === Number(user.id)) {
      return
    }

    // 3. Current assignee can reassign or unassign
    if (task.assigned_to && Number(task.assigned_to) === Number(user.id)) {
      return
    }

    // 4. Check organization role
    const orgUser = await db
      .from('organization_users')
      .where('organization_id', task.organization_id)
      .where('user_id', user.id)
      .useTransaction(trx)
      .first()

    if (!orgUser) {
      throw new Error('Bạn không có quyền giao task này')
    }

    // Organization Owner/Manager can assign
    const isOrgOwnerOrManager = [1, 2].includes(orgUser.role_id)
    if (isOrgOwnerOrManager) {
      return
    }

    throw new Error('Bạn không có quyền giao task này')
  }

  /**
   * Validate assignee thuộc organization
   */
  private async validateAssignee(
    assigneeId: number,
    organizationId: number,
    trx: TransactionClientContract
  ): Promise<void> {
    // Check if assignee exists
    const assignee = await User.find(assigneeId)
    if (!assignee) {
      throw new Error('Người được giao không tồn tại')
    }

    // Check if assignee belongs to organization
    const orgUser = await db
      .from('organization_users')
      .where('organization_id', organizationId)
      .where('user_id', assigneeId)
      .useTransaction(trx)
      .first()

    if (!orgUser) {
      throw new Error('Người được giao không thuộc tổ chức này')
    }
  }

  /**
   * Send notifications cho assignment
   */
  private async sendAssignmentNotifications(
    task: Task,
    assigner: User,
    dto: AssignTaskDTO
  ): Promise<void> {
    try {
      const oldAssignedTo = task.$extras.oldAssignedTo

      // Unassign: Notify old assignee
      if (dto.isUnassigning() && oldAssignedTo && oldAssignedTo !== assigner.id) {
        const oldAssignee = await User.find(oldAssignedTo)
        if (oldAssignee) {
          await this.createNotification.handle({
            user_id: oldAssignee.id,
            title: 'Cập nhật nhiệm vụ',
            message: dto.getNotificationMessage(task.title, assigner.username || assigner.email),
            type: 'task_unassigned',
            related_entity_type: 'task',
            related_entity_id: task.id,
          })
        }
      }

      // Assign/Reassign: Notify new assignee
      if (dto.isAssigning() && dto.assigned_to !== assigner.id) {
        const newAssignee = await User.find(dto.assigned_to!)
        if (newAssignee) {
          await this.createNotification.handle({
            user_id: newAssignee.id,
            title: 'Bạn có nhiệm vụ mới',
            message: dto.getNotificationMessage(task.title, assigner.username || assigner.email),
            type: 'task_assigned',
            related_entity_type: 'task',
            related_entity_id: task.id,
          })
        }

        // If reassigning, also notify old assignee (if different from new and assigner)
        if (oldAssignedTo && oldAssignedTo !== dto.assigned_to && oldAssignedTo !== assigner.id) {
          const oldAssignee = await User.find(oldAssignedTo)
          if (oldAssignee) {
            await this.createNotification.handle({
              user_id: oldAssignee.id,
              title: 'Cập nhật nhiệm vụ',
              message: `${assigner.username || assigner.email} đã chuyển nhiệm vụ "${task.title}" cho người khác`,
              type: 'task_reassigned',
              related_entity_type: 'task',
              related_entity_id: task.id,
            })
          }
        }
      }
    } catch (error) {
      // Don't fail assignment if notification fails
      this.logError('Failed to send assignment notifications', error)
    }
  }

  /**
   * Log error
   */
  private logError(message: string, error: any): void {
    console.error(`[AssignTaskCommand] ${message}`, error)
  }
}
