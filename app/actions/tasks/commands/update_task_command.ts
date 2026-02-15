import Task from '#models/task'
import User from '#models/user'
import AuditLog from '#models/audit_log'
import type UpdateTaskDTO from '../dtos/update_task_dto.js'
import type CreateNotification from '#actions/common/create_notification'
import type { ExecutionContext } from '#types/execution_context'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { AuditAction, EntityType } from '#constants/audit_constants'
import CacheService from '#services/cache_service'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import ForbiddenException from '#exceptions/forbidden_exception'
import BusinessLogicException from '#exceptions/business_logic_exception'
import emitter from '@adonisjs/core/services/emitter'
import loggerService from '#services/logger_service'
import type { DatabaseId } from '#types/database'

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
    protected execCtx: ExecutionContext,
    private createNotification: CreateNotification
  ) {}

  /**
   * Execute command để cập nhật task
   *
   * Di chuyển logic từ database triggers:
   * - before_task_update: Validate assignee thuộc org
   * - task_version_after_update: Tạo version history khi có thay đổi
   */
  async execute(taskId: DatabaseId, dto: UpdateTaskDTO): Promise<Task> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    // Check if DTO has any updates
    if (!dto.hasUpdates()) {
      throw new BusinessLogicException('Không có thay đổi nào để cập nhật')
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
      if (existingTask.organization_id !== this.execCtx.organizationId) {
        throw new ForbiddenException('Task không thuộc tổ chức hiện tại')
      }

      // Validate assignee thuộc org (logic từ before_task_update trigger)
      if (dto.assigned_to !== undefined && dto.assigned_to !== null) {
        await this.validateAssigneeInOrg(dto.assigned_to, existingTask.organization_id, trx)
      }

      // Check permission
      await this.validateUpdatePermission(userId, existingTask, dto)

      // Save old values for audit and version history
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
          user_id: userId,
          action: AuditAction.UPDATE,
          entity_type: EntityType.TASK,
          entity_id: taskId,
          old_values: oldValues,
          new_values: existingTask.toJSON(),
          ip_address: this.execCtx.ip,
          user_agent: this.execCtx.userAgent,
        },
        { client: trx }
      )

      // Create task version (logic từ task_version_after_update trigger)
      await this.createTaskVersion(existingTask, oldValues, userId, trx)

      // Store old values for notifications (outside transaction)
      existingTask.$extras.oldAssignedTo = oldAssignedTo
      existingTask.$extras.oldStatusId = oldStatusId
      existingTask.$extras.changes = changes

      await trx.commit()

      // Emit domain event (replaces task_version_after_update trigger side-effects)
      void emitter.emit('task:updated', {
        task: existingTask,
        updatedBy: userId,
        changes: existingTask.$extras.changes as Record<string, unknown>,
        previousValues: oldValues as Record<string, unknown>,
      })

      // Invalidate task-related caches
      await CacheService.deleteByPattern(`task:${String(taskId)}:*`)
      await CacheService.deleteByPattern(`organization:tasks:*`)
      await CacheService.deleteByPattern(`task:user:*`)

      // Send notifications (outside transaction)
      await this.sendNotifications(existingTask, userId, dto)

      // Load full relations (batch load để tránh N+1)
      await existingTask.load((loader) => {
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
          .load('childTasks', (query) => {
            void query.whereNull('deleted_at')
            void query.preload('status')
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
    userId: DatabaseId,
    task: Task,
    dto: UpdateTaskDTO
  ): Promise<void> {
    // Check if user is system superadmin via system_roles table (suar.sql)
    const userData = (await db
      .from('users')
      .join('system_roles', 'users.system_role_id', 'system_roles.id')
      .where('users.id', userId)
      .select('system_roles.name as role_name')
      .first()) as { role_name?: string } | null

    // 1. Superadmin/Admin have full access
    const isSuperAdmin = ['superadmin', 'admin'].includes(userData?.role_name?.toLowerCase() || '')
    if (isSuperAdmin) {
      return
    }

    // 2. Creator has full access
    if (task.creator_id === userId) {
      return
    }

    // 3. Assignee has full access
    if (task.assigned_to && task.assigned_to === userId) {
      return
    }

    // 4. Check organization role
    const orgUser = (await db
      .from('organization_users')
      .where('organization_id', task.organization_id)
      .where('user_id', userId)
      .first()) as { role_id: number } | null

    if (!orgUser) {
      throw new ForbiddenException('Bạn không có quyền cập nhật task này')
    }

    // Organization Owner/Manager (role_id 1,2) has limited access
    const isOrgOwnerOrManager = [1, 2].includes(orgUser.role_id)
    if (isOrgOwnerOrManager) {
      // Can only update: description, status, due_date, estimated_time
      const allowedFields = ['description', 'status_id', 'due_date', 'estimated_time']
      const updatedFields = dto.getUpdatedFields()
      const restrictedFields = updatedFields.filter((f) => !allowedFields.includes(f))

      if (restrictedFields.length > 0) {
        throw new ForbiddenException(
          `Bạn chỉ có thể cập nhật: ${allowedFields.join(', ')}. Không được phép: ${restrictedFields.join(', ')}`
        )
      }

      return
    }

    // Member không có quyền
    throw new ForbiddenException('Bạn không có quyền cập nhật task này')
  }

  /**
   * Send notifications cho các thay đổi
   */
  private async sendNotifications(
    task: Task,
    updaterId: DatabaseId,
    dto: UpdateTaskDTO
  ): Promise<void> {
    try {
      const oldAssignedTo = task.$extras.oldAssignedTo as string | null | undefined
      const oldStatusId = task.$extras.oldStatusId as string | undefined

      // Load updater info for notification messages
      const updater = await User.find(updaterId)
      const updaterName = updater?.username ?? updater?.email ?? 'Unknown'

      // Notify new assignee if assignment changed
      if (dto.hasAssigneeChange() && task.assigned_to && task.assigned_to !== oldAssignedTo) {
        // Don't notify if assigning to self
        if (String(task.assigned_to) !== String(updaterId)) {
          const assignee = await User.find(task.assigned_to)
          if (assignee) {
            await this.createNotification.handle({
              user_id: assignee.id,
              title: 'Bạn có nhiệm vụ mới',
              message: `${updaterName} đã giao cho bạn nhiệm vụ: ${task.title}`,
              type: 'task_assigned',
              related_entity_type: 'task',
              related_entity_id: task.id,
            })
          }
        }
      }

      // Notify creator if status changed (and creator is not the updater)
      if (dto.hasStatusChange() && task.status_id !== oldStatusId) {
        if (task.creator_id && String(task.creator_id) !== String(updaterId)) {
          await this.createNotification.handle({
            user_id: task.creator_id,
            title: 'Cập nhật nhiệm vụ',
            message: `${updaterName} đã cập nhật trạng thái nhiệm vụ: ${task.title}`,
            type: 'task_status_updated',
            related_entity_type: 'task',
            related_entity_id: task.id,
          })
        }
      }

      // Notify old assignee if unassigned
      if (dto.isUnassigning() && oldAssignedTo && String(oldAssignedTo) !== String(updaterId)) {
        const oldAssignee = await User.find(oldAssignedTo)
        if (oldAssignee) {
          await this.createNotification.handle({
            user_id: oldAssignee.id,
            title: 'Cập nhật nhiệm vụ',
            message: `${updaterName} đã bỏ giao nhiệm vụ: ${task.title}`,
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
    loggerService.error(`[UpdateTaskCommand] ${message}`, error)
  }

  /**
   * Validate assignee thuộc organization
   * Logic từ before_task_update trigger:
   *   IF NEW.assigned_to IS NOT NULL THEN
   *     IF NOT EXISTS (SELECT 1 FROM organization_users WHERE user_id = NEW.assigned_to AND organization_id = NEW.organization_id)
   *     THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Người được gán phải thuộc cùng tổ chức'
   */
  private async validateAssigneeInOrg(
    assigneeId: DatabaseId,
    organizationId: DatabaseId,
    trx: TransactionClientContract
  ): Promise<void> {
    const membership = (await trx
      .from('organization_users')
      .where('organization_id', organizationId)
      .where('user_id', assigneeId)
      .where('status', 'approved')
      .first()) as { id: DatabaseId } | null

    if (!membership) {
      // Check if freelancer (like in CreateTaskCommand)
      const isFreelancer = (await trx
        .from('user_details')
        .where('user_id', assigneeId)
        .where('is_freelancer', true)
        .first()) as { user_id: DatabaseId } | null

      if (!isFreelancer) {
        throw new BusinessLogicException('Người được gán phải thuộc cùng tổ chức hoặc là freelancer')
      }
    }
  }

  /**
   * Create task version when task is updated
   * Logic từ task_version_after_update trigger:
   *   IF NOT (NEW.title <=> OLD.title) OR NOT (NEW.description <=> OLD.description) OR ...
   *   THEN INSERT INTO task_versions (task_id, title, description, status_id, ...)
   */
  private async createTaskVersion(
    task: Task,
    oldValues: Record<string, unknown>,
    changedBy: DatabaseId,
    trx: TransactionClientContract
  ): Promise<void> {
    // Check if any tracked field changed
    const trackedFields = [
      'title',
      'description',
      'status_id',
      'label_id',
      'priority_id',
      'assigned_to',
      'due_date',
      'parent_task_id',
      'estimated_time',
      'actual_time',
      'organization_id',
    ]

    const hasChanges = trackedFields.some((field) => {
      const oldVal = oldValues[field]
      const newVal = task[field as keyof Task]
      return oldVal !== newVal
    })

    if (!hasChanges) return

    // Insert into task_versions
    await trx.table('task_versions').insert({
      task_id: oldValues.id,
      title: oldValues.title,
      description: oldValues.description,
      status_id: oldValues.status_id,
      label_id: oldValues.label_id,
      priority_id: oldValues.priority_id,
      assigned_to: oldValues.assigned_to,
      changed_by: changedBy,
      created_at: new Date(),
    })
  }
}
