import type Task from '#models/task'
import TaskRepository from '#infra/tasks/repositories/task_repository'
import CreateAuditLog from '#actions/common/create_audit_log'
import UserRepository from '#infra/users/repositories/user_repository'
import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type AssignTaskDTO from '../dtos/request/assign_task_dto.js'
import type CreateNotification from '#actions/common/create_notification'
import type { ExecutionContext } from '#types/execution_context'
import { AuditAction, EntityType } from '#constants/audit_constants'
import CacheService from '#services/cache_service'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import NotFoundException from '#exceptions/not_found_exception'
import emitter from '@adonisjs/core/services/emitter'
import loggerService from '#services/logger_service'
import type { DatabaseId } from '#types/database'
import { enforcePolicy } from '#actions/shared/enforce_policy'
import { canAssignTask } from '#domain/tasks/task_permission_policy'
import { validateAssignee } from '#domain/tasks/task_assignment_rules'
import { buildTaskPermissionContext } from '#actions/tasks/support/task_permission_context_builder'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
} from '#constants/notification_constants'

interface PersistedTaskAssignment {
  task: Task
  oldAssignedTo: DatabaseId | null
}

/**
 * Command để giao task cho người dùng
 *
 * Business Rules:
 * - Assign/Reassign/Unassign
 * - User phải thuộc cùng organization hoặc là freelancer
 * - Notification gửi cho assignee mới (và có thể old assignee)
 * - Audit log đầy đủ
 *
 * Pattern: FETCH → DECIDE → PERSIST → POST-COMMIT
 */
export default class AssignTaskCommand {
  constructor(
    protected execCtx: ExecutionContext,
    private createNotification: CreateNotification
  ) {}

  async execute(dto: AssignTaskDTO): Promise<Task> {
    const userId = this.requireUserId()
    const assignmentResult = await this.persistAssignmentInTransaction(dto, userId)
    await this.runPostCommitEffects(assignmentResult, dto, userId)
    return await TaskRepository.findByIdWithDetailRelations(assignmentResult.task.id)
  }

  private requireUserId(): DatabaseId {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    return userId
  }

  private async loadTaskForAssignment(
    taskId: DatabaseId,
    trx: TransactionClientContract
  ): Promise<Task> {
    return TaskRepository.findActiveForUpdate(taskId, trx)
  }

  private async ensureAssignmentPreconditions(
    userId: DatabaseId,
    dto: AssignTaskDTO,
    task: Task,
    trx: TransactionClientContract
  ): Promise<void> {
    const permissionContext = await buildTaskPermissionContext(userId, task, trx)
    enforcePolicy(canAssignTask(permissionContext))

    if (!dto.isAssigning() || dto.assigned_to === null) {
      return
    }

    const assignee = await UserRepository.findById(dto.assigned_to, trx)
    if (!assignee) {
      throw new NotFoundException('Người được giao không tồn tại')
    }

    const isMember = await OrganizationUserRepository.isApprovedMember(
      dto.assigned_to,
      task.organization_id,
      trx
    )
    const isFreelancer = await UserRepository.isFreelancer(dto.assigned_to, trx)

    enforcePolicy(
      validateAssignee({
        isOrgMember: isMember,
        isFreelancer,
        taskVisibility: task.task_visibility,
      })
    )
  }

  private async persistAssignment(
    task: Task,
    dto: AssignTaskDTO,
    userId: DatabaseId,
    trx: TransactionClientContract
  ): Promise<PersistedTaskAssignment> {
    const oldAssignedTo = task.assigned_to
    const oldValues = task.toJSON()

    task.assigned_to = dto.assigned_to
    task.updated_by = userId
    await TaskRepository.save(task, trx)

    await new CreateAuditLog(this.execCtx).handle({
      user_id: userId,
      action: dto.isUnassigning() ? AuditAction.UNASSIGN : AuditAction.ASSIGN,
      entity_type: EntityType.TASK,
      entity_id: dto.task_id,
      old_values: oldValues,
      new_values: task.toJSON(),
    })

    return {
      task,
      oldAssignedTo,
    }
  }

  private async persistAssignmentInTransaction(
    dto: AssignTaskDTO,
    userId: DatabaseId
  ): Promise<PersistedTaskAssignment> {
    const trx = await db.transaction()

    try {
      const task = await this.loadTaskForAssignment(dto.task_id, trx)
      await this.ensureAssignmentPreconditions(userId, dto, task, trx)
      const result = await this.persistAssignment(task, dto, userId, trx)
      await trx.commit()
      return result
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  private async runPostCommitEffects(
    result: PersistedTaskAssignment,
    dto: AssignTaskDTO,
    userId: DatabaseId
  ): Promise<void> {
    if (dto.isAssigning() && dto.assigned_to !== null) {
      void emitter.emit('task:assigned', {
        taskId: dto.task_id,
        assigneeId: dto.assigned_to,
        assignedBy: userId,
        assignmentType: 'assign',
      })
    }

    await Promise.all([
      CacheService.deleteByPattern(`task:${dto.task_id}:*`),
      CacheService.deleteByPattern('task:user:*'),
      CacheService.deleteByPattern('task:applications:*'),
    ])

    if (dto.shouldNotify()) {
      await this.sendAssignmentNotifications(result.task, userId, dto, result.oldAssignedTo)
    }
  }

  /**
   * Send notifications cho assignment
   */
  private async sendAssignmentNotifications(
    task: Task,
    assignerId: DatabaseId,
    dto: AssignTaskDTO,
    oldAssignedTo: DatabaseId | null
  ): Promise<void> {
    try {
      const assigner = await UserRepository.findById(assignerId)
      if (!assigner) return

      const assignerName = assigner.username || assigner.email || 'Unknown'

      if (dto.isUnassigning() && oldAssignedTo && oldAssignedTo !== assigner.id) {
        const oldAssignee = await UserRepository.findById(oldAssignedTo)
        if (oldAssignee) {
          await this.createNotification.handle({
            user_id: oldAssignee.id,
            title: 'Cập nhật nhiệm vụ',
            message: dto.getNotificationMessage(task.title, assignerName),
            type: BACKEND_NOTIFICATION_TYPES.TASK_UNASSIGNED,
            related_entity_type: BACKEND_NOTIFICATION_ENTITY_TYPES.TASK,
            related_entity_id: task.id,
          })
        }
      }

      if (dto.isAssigning() && dto.assigned_to !== null && dto.assigned_to !== assigner.id) {
        const newAssignee = await UserRepository.findById(dto.assigned_to)
        if (newAssignee) {
          await this.createNotification.handle({
            user_id: newAssignee.id,
            title: 'Bạn có nhiệm vụ mới',
            message: dto.getNotificationMessage(task.title, assignerName),
            type: BACKEND_NOTIFICATION_TYPES.TASK_ASSIGNED,
            related_entity_type: BACKEND_NOTIFICATION_ENTITY_TYPES.TASK,
            related_entity_id: task.id,
          })
        }

        if (oldAssignedTo && oldAssignedTo !== dto.assigned_to && oldAssignedTo !== assigner.id) {
          const oldAssignee = await UserRepository.findById(oldAssignedTo)
          if (oldAssignee) {
            await this.createNotification.handle({
              user_id: oldAssignee.id,
              title: 'Cập nhật nhiệm vụ',
              message: `${assignerName} đã chuyển nhiệm vụ "${task.title}" cho người khác`,
              type: BACKEND_NOTIFICATION_TYPES.TASK_REASSIGNED,
              related_entity_type: BACKEND_NOTIFICATION_ENTITY_TYPES.TASK,
              related_entity_id: task.id,
            })
          }
        }
      }
    } catch (error) {
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
