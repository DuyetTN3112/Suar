import Task from '#models/task'
import User from '#models/user'
import AuditLog from '#models/mongo/audit_log'
import UserRepository from '#repositories/user_repository'
import OrganizationUserRepository from '#repositories/organization_user_repository'
import db from '@adonisjs/lucid/services/db'
import type AssignTaskDTO from '../dtos/assign_task_dto.js'
import type CreateNotification from '#actions/common/create_notification'
import type { ExecutionContext } from '#types/execution_context'
import { AuditAction, EntityType } from '#constants/audit_constants'
import CacheService from '#services/cache_service'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import NotFoundException from '#exceptions/not_found_exception'
import emitter from '@adonisjs/core/services/emitter'
import loggerService from '#services/logger_service'
import type { DatabaseId } from '#types/database'
import { enforcePolicy } from '#domain/shared/enforce_policy'
import { canAssignTask } from '#domain/tasks/task_permission_policy'
import { validateAssignee } from '#domain/tasks/task_assignment_rules'

/**
 * Command để giao task cho người dùng
 *
 * Business Rules:
 * - Assign/Reassign/Unassign
 * - User phải thuộc cùng organization hoặc là freelancer
 * - Notification gửi cho assignee mới (và có thể old assignee)
 * - Audit log đầy đủ
 *
 * Pattern: FETCH → DECIDE → PERSIST
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
      // ── FETCH ──────────────────────────────────────────────────────────
      const existingTask = await Task.query({ client: trx })
        .where('id', dto.task_id)
        .whereNull('deleted_at')
        .forUpdate()
        .firstOrFail()

      const [systemRole, orgRole] = await Promise.all([
        UserRepository.getSystemRoleName(userId),
        OrganizationUserRepository.getMemberRoleName(existingTask.organization_id, userId, undefined, false),
      ])

      // ── DECIDE (pure, sync) ────────────────────────────────────────────
      enforcePolicy(
        canAssignTask({
          actorId: userId,
          actorSystemRole: systemRole,
          actorOrgRole: orgRole,
          actorProjectRole: null,
          taskCreatorId: existingTask.creator_id,
          taskAssignedTo: existingTask.assigned_to,
          taskOrganizationId: existingTask.organization_id,
          taskProjectId: existingTask.project_id,
          isActiveAssignee: false,
        })
      )

      // If assigning (not unassigning), validate assignee
      if (dto.isAssigning() && dto.assigned_to !== null) {
        const assignee = await User.find(dto.assigned_to)
        if (!assignee) {
          throw new NotFoundException('Người được giao không tồn tại')
        }

        const [isMember, isFreelancer] = await Promise.all([
          OrganizationUserRepository.isMember(dto.assigned_to, existingTask.organization_id),
          UserRepository.isFreelancer(dto.assigned_to),
        ])

        enforcePolicy(
          validateAssignee({
            isOrgMember: isMember,
            isFreelancer,
            taskVisibility: existingTask.task_visibility ?? 'internal',
          })
        )
      }

      // ── PERSIST ────────────────────────────────────────────────────────
      const oldAssignedTo = existingTask.assigned_to
      const oldValues = existingTask.toJSON()

      existingTask.assigned_to = dto.assigned_to !== null ? String(dto.assigned_to) : null
      existingTask.updated_by = userId
      await existingTask.useTransaction(trx).save()

      await AuditLog.create({
        user_id: userId,
        action: dto.isUnassigning() ? AuditAction.UNASSIGN : AuditAction.ASSIGN,
        entity_type: EntityType.TASK,
        entity_id: dto.task_id,
        old_values: oldValues,
        new_values: existingTask.toJSON(),
        ip_address: this.execCtx.ip,
        user_agent: this.execCtx.userAgent,
      })

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
