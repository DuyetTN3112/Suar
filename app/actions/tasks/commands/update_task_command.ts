import Task from '#models/task'
import User from '#models/user'
import AuditLog from '#models/audit_log'
import UpdateTaskDTO from '../dtos/update_task_dto.js'
import CreateNotification from '#actions/common/create_notification'
import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'

/**
 * Command để cập nhật task
 *
 * Business Rules:
 * - Task phải thuộc organization hiện tại
 * - Permission-based updates:
 *   - Creator: Full access
 *   - Assignee: Full access
 *   - Admin/Superadmin: Full access
 *   - Org Owner/Manager: Limited access (description, dates, status only)
 * - Track old values cho audit
 * - Notifications:
 *   - Assignee changed → Notify new assignee
 *   - Status changed → Notify creator (if not self)
 * - Load full relations sau update
 *
 * Permissions hierarchy:
 * 1. Superadmin/Admin (role_id: 1,2)
 * 2. Creator
 * 3. Assignee
 * 4. Organization Owner/Manager (role_id: 1,2 trong org)
 */
export default class UpdateTaskCommand {
  constructor(
    protected ctx: HttpContext,
    private createNotification: CreateNotification
  ) {}

  /**
   * Execute command để cập nhật task
   */
  async execute(taskId: number, dto: UpdateTaskDTO): Promise<Task> {
    const user = this.ctx.auth.user!

    // Check if DTO has any updates
    if (!dto.hasUpdates()) {
      throw new Error('Không có thay đổi nào để cập nhật')
    }

    // Start transaction
    const trx = await db.transaction()

    try {
      // Load task với lock
      const existingTask = await Task.query({ client: trx })
        .where('id', taskId)
        .whereNull('deleted_at')
        .forUpdate()
        .firstOrFail()

      // Validate task thuộc organization hiện tại
      const currentOrganizationId = this.ctx.session.get('current_organization_id')
      if (Number(existingTask.organization_id) !== Number(currentOrganizationId)) {
        throw new Error('Task không thuộc tổ chức hiện tại')
      }

      // Check permission
      await this.validateUpdatePermission(user, existingTask, dto)

      // Save old values for audit
      const oldValues = existingTask.toJSON()
      const oldAssignedTo = existingTask.assigned_to
      const oldStatusId = existingTask.status_id

      // Merge updates
      existingTask.merge(dto.toObject())
      await existingTask.save()

      // Create audit log
      const changes = dto.getChangesForAudit(oldValues)
      await AuditLog.create(
        {
          user_id: user.id,
          action: 'update',
          entity_type: 'task',
          entity_id: taskId,
          old_values: oldValues,
          new_values: existingTask.toJSON(),
          ip_address: this.ctx.request.ip(),
          user_agent: this.ctx.request.header('user-agent'),
        },
        { client: trx }
      )

      // Store old values for notifications (outside transaction)
      existingTask.$extras.oldAssignedTo = oldAssignedTo
      existingTask.$extras.oldStatusId = oldStatusId
      existingTask.$extras.changes = changes

      await trx.commit()

      // Send notifications (outside transaction)
      await this.sendNotifications(existingTask, user, dto)

      // Load full relations
      await existingTask.load((loader: unknown) => {
        loader
          .load('status')
          .load('label')
          .load('priority')
          .load('assignee')
          .load('creator')
          .load('updater')
          .load('organization')
          .load('project')
          .load('parentTask')
          .load('childTasks', (query: unknown) => {
            query.whereNull('deleted_at').preload('status')
          })
      })

      return existingTask
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  /**
   * Validate permission để update task
   */
  private async validateUpdatePermission(
    user: User,
    task: Task,
    dto: UpdateTaskDTO
  ): Promise<void> {
    // Load user role
    await user.load('role')

    // 1. Superadmin/Admin have full access
    const isSuperAdmin = ['superadmin', 'admin'].includes(user.role?.name?.toLowerCase() || '')
    if (isSuperAdmin) {
      return
    }

    // 2. Creator has full access
    if (Number(task.creator_id) === Number(user.id)) {
      return
    }

    // 3. Assignee has full access
    if (task.assigned_to && Number(task.assigned_to) === Number(user.id)) {
      return
    }

    // 4. Check organization role
    const orgUser = await db
      .from('organization_users')
      .where('organization_id', task.organization_id)
      .where('user_id', user.id)
      .first()

    if (!orgUser) {
      throw new Error('Bạn không có quyền cập nhật task này')
    }

    // Organization Owner/Manager (role_id 1,2) has limited access
    const isOrgOwnerOrManager = [1, 2].includes(orgUser.role_id)
    if (isOrgOwnerOrManager) {
      // Can only update: description, status, due_date, estimated_time
      const allowedFields = ['description', 'status_id', 'due_date', 'estimated_time']
      const updatedFields = dto.getUpdatedFields()
      const restrictedFields = updatedFields.filter((f) => !allowedFields.includes(f))

      if (restrictedFields.length > 0) {
        throw new Error(
          `Bạn chỉ có thể cập nhật: ${allowedFields.join(', ')}. Không được phép: ${restrictedFields.join(', ')}`
        )
      }

      return
    }

    // Member không có quyền
    throw new Error('Bạn không có quyền cập nhật task này')
  }

  /**
   * Send notifications cho các thay đổi
   */
  private async sendNotifications(task: Task, updater: User, dto: UpdateTaskDTO): Promise<void> {
    try {
      const oldAssignedTo = task.$extras.oldAssignedTo
      const oldStatusId = task.$extras.oldStatusId

      // Notify new assignee if assignment changed
      if (dto.hasAssigneeChange() && task.assigned_to && task.assigned_to !== oldAssignedTo) {
        // Don't notify if assigning to self
        if (task.assigned_to !== updater.id) {
          const assignee = await User.find(task.assigned_to)
          if (assignee) {
            await this.createNotification.handle({
              user_id: assignee.id,
              title: 'Bạn có nhiệm vụ mới',
              message: `${updater.username || updater.email} đã giao cho bạn nhiệm vụ: ${task.title}`,
              type: 'task_assigned',
              related_entity_type: 'task',
              related_entity_id: task.id,
            })
          }
        }
      }

      // Notify creator if status changed (and creator is not the updater)
      if (dto.hasStatusChange() && task.status_id !== oldStatusId) {
        if (task.creator_id && task.creator_id !== updater.id) {
          await this.createNotification.handle({
            user_id: task.creator_id,
            title: 'Cập nhật nhiệm vụ',
            message: `${updater.username || updater.email} đã cập nhật trạng thái nhiệm vụ: ${task.title}`,
            type: 'task_status_updated',
            related_entity_type: 'task',
            related_entity_id: task.id,
          })
        }
      }

      // Notify old assignee if unassigned
      if (dto.isUnassigning() && oldAssignedTo && oldAssignedTo !== updater.id) {
        const oldAssignee = await User.find(oldAssignedTo)
        if (oldAssignee) {
          await this.createNotification.handle({
            user_id: oldAssignee.id,
            title: 'Cập nhật nhiệm vụ',
            message: `${updater.username || updater.email} đã bỏ giao nhiệm vụ: ${task.title}`,
            type: 'task_updated',
            related_entity_type: 'task',
            related_entity_id: task.id,
          })
        }
      }
    } catch (error) {
      // Don't fail update if notification fails
      this.logError('Failed to send update notifications', error)
    }
  }

  /**
   * Log error
   */
  private logError(message: string, error: unknown): void {
    console.error(`[UpdateTaskCommand] ${message}`, error)
  }
}
