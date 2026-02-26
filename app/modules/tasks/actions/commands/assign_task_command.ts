import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type AssignTaskDTO from '../dtos/request/assign_task_dto.js'

import { AuditAction, EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import loggerService from '#modules/logger/public_contracts/logger_service'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
} from '#modules/notifications/public_contracts/notification_constants'
import type { NotificationCreator } from '#modules/notifications/public_contracts/notification_creator'
import type { TaskCachePort } from '#modules/tasks/actions/ports/task_cache_port'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/task_external_dependencies'
import { buildTaskPermissionContext } from '#modules/tasks/actions/support/task_permission_context_builder'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { validateAssignee } from '#modules/tasks/domain/task_assignment_rules'
import { canAssignTask } from '#modules/tasks/domain/task_permission_policy'
import * as detailQueries from '#modules/tasks/infra/repositories/read/detail_queries'
import * as taskMutations from '#modules/tasks/infra/repositories/write/task_mutations'
import type { TaskRecord, TaskDetailRecord } from '#modules/tasks/types/task_records'

interface PersistedTaskAssignment {
  task: TaskRecord
  oldAssignedTo: string | null
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
    protected execCtx: TaskActionContext,
    private createNotification: NotificationCreator,
    private taskExternalDependencies: TaskExternalDependencies,
    private cache: TaskCachePort
  ) {}

  async execute(dto: AssignTaskDTO): Promise<TaskDetailRecord> {
    const userId = this.requireUserId()
    const assignmentResult = await this.persistAssignmentInTransaction(dto, userId)
    await this.runPostCommitEffects(assignmentResult, dto, userId)
    return await detailQueries.findByIdWithDetailRecord(assignmentResult.task.id)
  }

  private requireUserId(): string {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    return userId
  }

  private async loadTaskForAssignment(
    taskId: string,
    trx: TransactionClientContract
  ): Promise<TaskRecord> {
    return taskMutations.findActiveForUpdateAsRecord(taskId, trx)
  }

  private async ensureAssignmentPreconditions(
    userId: string,
    dto: AssignTaskDTO,
    task: TaskRecord,
    trx: TransactionClientContract
  ): Promise<void> {
    const permissionContext = await buildTaskPermissionContext(
      userId,
      task,
      trx,
      this.taskExternalDependencies.permission
    )
    enforcePolicy(canAssignTask(permissionContext))

    if (!dto.isAssigning() || dto.assigned_to === null) {
      return
    }

    const assignee = await this.taskExternalDependencies.user.findUserIdentity(
      dto.assigned_to,
      trx
    )
    if (!assignee) {
      throw new NotFoundException('Người được giao không tồn tại')
    }

    const isMember = await this.taskExternalDependencies.org.isApprovedMember(
      dto.assigned_to,
      task.organization_id,
      trx
    )
    const isFreelancer = await this.taskExternalDependencies.user.isFreelancer(
      dto.assigned_to,
      trx
    )

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
    userId: string,
    trx: TransactionClientContract
  ): Promise<PersistedTaskAssignment> {
    const oldAssignedTo = task.assigned_to
    const oldValues = { ...task }

    const updatedTask = await taskMutations.updateTask(
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
    userId: string
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
    userId: string
  ): Promise<void> {
    if (dto.isAssigning() && dto.assigned_to !== null) {
      void emitter.emit('task:assigned', {
        taskId: dto.task_id,
        assigneeId: dto.assigned_to,
        assignedBy: userId,
        assignmentType: 'assign',
      })
    }

    await this.cache.invalidateAfterTaskAssigned(dto.task_id)

    if (dto.shouldNotify()) {
      await this.sendAssignmentNotifications(result.task, userId, dto, result.oldAssignedTo)
    }
  }

  /**
   * Send notifications cho assignment
   */
  private async sendAssignmentNotifications(
    task: TaskRecord,
    assignerId: string,
    dto: AssignTaskDTO,
    oldAssignedTo: string | null
  ): Promise<void> {
    try {
      const assigner = await this.taskExternalDependencies.user.findUserIdentity(assignerId)
      if (!assigner) return

      const assignerName = assigner.username

      if (dto.isUnassigning() && oldAssignedTo && oldAssignedTo !== assigner.id) {
        const oldAssignee = await this.taskExternalDependencies.user.findUserIdentity(
          oldAssignedTo
        )
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
        const newAssignee = await this.taskExternalDependencies.user.findUserIdentity(
          dto.assigned_to
        )
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
          const oldAssignee = await this.taskExternalDependencies.user.findUserIdentity(
            oldAssignedTo
          )
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
