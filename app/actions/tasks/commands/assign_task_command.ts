import Task from '#models/task'
import User from '#models/user'
import AuditLog from '#models/audit_log'
import OrganizationUser from '#models/organization_user'
import db from '@adonisjs/lucid/services/db'
import type AssignTaskDTO from '../dtos/assign_task_dto.js'
import type CreateNotification from '#actions/common/create_notification'
import type { ExecutionContext } from '#types/execution_context'
import { AuditAction, EntityType } from '#constants/audit_constants'
import CacheService from '#services/cache_service'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import ForbiddenException from '#exceptions/forbidden_exception'
import NotFoundException from '#exceptions/not_found_exception'
import BusinessLogicException from '#exceptions/business_logic_exception'
import emitter from '@adonisjs/core/services/emitter'
import loggerService from '#services/logger_service'
import type { DatabaseId } from '#types/database'

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
    protected execCtx: ExecutionContext,
    private createNotification: CreateNotification
  ) {}

  /**
   * Execute command để assign task
   */
  async execute(dto: AssignTaskDTO): Promise<Task> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

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
      await this.validateAssignPermission(userId, existingTask)

      // If assigning (not unassigning), validate assignee
      if (dto.isAssigning() && dto.assigned_to !== null) {
        await this.validateAssignee(dto.assigned_to, existingTask.organization_id)
      }

      // Save old value for audit
      const oldAssignedTo = existingTask.assigned_to
      const oldValues = existingTask.toJSON()

      // Update assignment
      existingTask.assigned_to = dto.assigned_to !== null ? String(dto.assigned_to) : null
      existingTask.updated_by = userId
      await existingTask.useTransaction(trx).save()

      // Create audit log
      await AuditLog.create(
        {
          user_id: userId,
          action: dto.isUnassigning() ? AuditAction.UNASSIGN : AuditAction.ASSIGN,
          entity_type: EntityType.TASK,
          entity_id: dto.task_id,
          old_values: oldValues,
          new_values: existingTask.toJSON(),
          ip_address: this.execCtx.ip,
          user_agent: this.execCtx.userAgent,
        },
        { client: trx }
      )

      // Commit transaction
      await trx.commit()

      // Emit domain event
      if (dto.isAssigning() && dto.assigned_to !== null) {
        void emitter.emit('task:assigned', {
          taskId: dto.task_id,
          assigneeId: dto.assigned_to,
          assignedBy: userId,
          assignmentType: dto.isUnassigning() ? 'unassign' : 'assign',
        })
      }

      // Invalidate task-related caches
      await CacheService.deleteByPattern(`task:${String(dto.task_id)}:*`)
      await CacheService.deleteByPattern(`task:user:*`)
      await CacheService.deleteByPattern(`task:applications:*`)

      // Store old value for notifications (after commit)
      existingTask.$extras.oldAssignedTo = oldAssignedTo

      // Send notifications (outside transaction)
      if (dto.shouldNotify()) {
        await this.sendAssignmentNotifications(existingTask, userId, dto)
      }

      // Load relations
      await existingTask.load((loader) => {
        loader.load('assignee').load('creator').load('updater').load('organization')
      })

      return existingTask
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  /**
   * Validate permission để assign task → delegate to Model
   */
  private async validateAssignPermission(userId: DatabaseId, task: Task): Promise<void> {
    // 1. Superadmin/Admin have full access → delegate to Model
    const isSystemAdmin = await User.isSystemAdmin(userId)
    if (isSystemAdmin) {
      return
    }

    // 2. Creator can assign
    if (task.creator_id === userId) {
      return
    }

    // 3. Current assignee can reassign or unassign
    if (task.assigned_to === userId) {
      return
    }

    // 4. Check organization role → delegate to Model

    const orgRole = await OrganizationUser.getOrgRole(userId, task.organization_id)

    if (!orgRole) {
      throw new ForbiddenException('Bạn không có quyền giao task này')
    }

    // Organization Owner/Admin can assign
    const isOrgOwnerOrAdmin = ['org_owner', 'org_admin'].includes(orgRole)
    if (isOrgOwnerOrAdmin) {
      return
    }

    throw new ForbiddenException('Bạn không có quyền giao task này')
  }

  /**
   * Validate assignee thuộc organization → delegate to Model
   */
  private async validateAssignee(
    assigneeId: DatabaseId,
    organizationId: DatabaseId
  ): Promise<void> {
    // Check if assignee exists
    const assignee = await User.find(assigneeId)
    if (!assignee) {
      throw new NotFoundException('Người được giao không tồn tại')
    }

    // Check if assignee belongs to organization → delegate to Model
    const isMember = await OrganizationUser.isMember(assigneeId, organizationId)

    if (!isMember) {
      throw new BusinessLogicException('Người được giao không thuộc tổ chức này')
    }
  }

  /**
   * Send notifications cho assignment
   */
  private async sendAssignmentNotifications(
    task: Task,
    assignerId: DatabaseId,
    dto: AssignTaskDTO
  ): Promise<void> {
    try {
      const assigner = await User.find(assignerId)
      if (!assigner) return

      const oldAssignedTo = task.$extras.oldAssignedTo as string | null | undefined

      // Unassign: Notify old assignee
      if (dto.isUnassigning() && oldAssignedTo && oldAssignedTo !== assigner.id) {
        const oldAssignee = await User.find(oldAssignedTo)
        if (oldAssignee) {
          await this.createNotification.handle({
            user_id: oldAssignee.id,
            title: 'Cập nhật nhiệm vụ',
            message: dto.getNotificationMessage(
              task.title,
              assigner.username || assigner.email || 'Unknown'
            ),
            type: 'task_unassigned',
            related_entity_type: 'task',
            related_entity_id: task.id,
          })
        }
      }

      // Assign/Reassign: Notify new assignee
      if (dto.isAssigning() && dto.assigned_to !== null && dto.assigned_to !== assigner.id) {
        const newAssignee = await User.find(dto.assigned_to)
        if (newAssignee) {
          await this.createNotification.handle({
            user_id: newAssignee.id,
            title: 'Bạn có nhiệm vụ mới',
            message: dto.getNotificationMessage(
              task.title,
              assigner.username || assigner.email || 'Unknown'
            ),
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
              message: `${assigner.username || assigner.email || 'Unknown'} đã chuyển nhiệm vụ "${task.title}" cho người khác`,
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
  private logError(message: string, error: unknown): void {
    loggerService.error(`[AssignTaskCommand] ${message}`, error)
  }
}
