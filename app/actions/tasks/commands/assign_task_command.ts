import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type AssignTaskDTO from '../dtos/request/assign_task_dto.js'
import { DefaultTaskDependencies } from '../ports/task_external_dependencies_impl.js'

import { auditPublicApi } from '#actions/audit/public_api'
import { enforcePolicy } from '#actions/authorization/public_api'
import type { NotificationCreator } from '#actions/notifications/public_api'
import { buildTaskPermissionContext } from '#actions/tasks/support/task_permission_context_builder'
import NotFoundException from '#exceptions/not_found_exception'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import CacheService from '#infra/cache/cache_service'
import loggerService from '#infra/logger/logger_service'
import TaskRepository from '#infra/tasks/repositories/task_repository'
import { AuditAction, EntityType } from '#modules/audit/constants/audit_constants'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
} from '#modules/notifications/constants/notification_constants'
import { validateAssignee } from '#modules/tasks/domain/task_assignment_rules'
import { canAssignTask } from '#modules/tasks/domain/task_permission_policy'
import type { DatabaseId } from '#types/database'
import type { ExecutionContext } from '#types/execution_context'
import type { TaskRecord, TaskDetailRecord } from '#types/task_records'

interface PersistedTaskAssignment {
  task: TaskRecord
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
    private createNotification: NotificationCreator
  ) {}

  async execute(dto: AssignTaskDTO): Promise<TaskDetailRecord> {
    const userId = this.requireUserId()
    const assignmentResult = await this.persistAssignmentInTransaction(dto, userId)
    await this.runPostCommitEffects(assignmentResult, dto, userId)
    return await TaskRepository.findByIdWithDetailRecord(assignmentResult.task.id)
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
  ): Promise<TaskRecord> {
    return TaskRepository.findActiveForUpdateAsRecord(taskId, trx)
  }

  private async ensureAssignmentPreconditions(
    userId: DatabaseId,
    dto: AssignTaskDTO,
    task: TaskRecord,
    trx: TransactionClientContract
  ): Promise<void> {
    const permissionContext = await buildTaskPermissionContext(userId, task, trx)
    enforcePolicy(canAssignTask(permissionContext))

    if (!dto.isAssigning() || dto.assigned_to === null) {
      return
    }

    const assignee = await DefaultTaskDependencies.user.findUserIdentity(dto.assigned_to, trx)
    if (!assignee) {
      throw new NotFoundException('Người được giao không tồn tại')
    }

    const isMember = await DefaultTaskDependencies.org.isApprovedMember(
      dto.assigned_to,
      task.organization_id,
      trx
    )
    const isFreelancer = await DefaultTaskDependencies.user.isFreelancer(dto.assigned_to, trx)

    enforcePolicy(
      validateAssignee({
        isOrgMember: isMember,
        isFreelancer,
        taskVisibility: task.task_visibility ?? 'public',
      })
    )
  }

  private async persistAssignment(
    task: TaskRecord,
    dto: AssignTaskDTO,
    userId: DatabaseId,
    trx: TransactionClientContract
  ): Promise<PersistedTaskAssignment> {
    const oldAssignedTo = task.assigned_to
    const oldValues = { ...task }

    const updatedTask = await TaskRepository.updateTask(
      task.id,
      {
        assigned_to: dto.assigned_to,
        updated_by: userId,
      },
      trx
    )

    await auditPublicApi.log(
      {
        user_id: userId,
        action: dto.isUnassigning() ? AuditAction.UNASSIGN : AuditAction.ASSIGN,
        entity_type: EntityType.TASK,
        entity_id: dto.task_id,
        old_values: oldValues,
        new_values: { ...updatedTask },
      },
      this.execCtx
    )

    return {
      task: updatedTask,
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
    task: TaskRecord,
    assignerId: DatabaseId,
    dto: AssignTaskDTO,
    oldAssignedTo: DatabaseId | null
  ): Promise<void> {
    try {
      const assigner = await DefaultTaskDependencies.user.findUserIdentity(assignerId)
      if (!assigner) return

      const assignerName = assigner.username

      if (dto.isUnassigning() && oldAssignedTo && oldAssignedTo !== assigner.id) {
        const oldAssignee = await DefaultTaskDependencies.user.findUserIdentity(oldAssignedTo)
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
        const newAssignee = await DefaultTaskDependencies.user.findUserIdentity(dto.assigned_to)
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
          const oldAssignee = await DefaultTaskDependencies.user.findUserIdentity(oldAssignedTo)
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
