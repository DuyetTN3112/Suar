import emitter from '@adonisjs/core/services/emitter'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { auditPublicApi } from '#actions/audit/public_api'
import { enforcePolicy } from '#actions/authorization/public_api'
import type { NotificationCreator } from '#actions/notifications/public_api'
import { projectPublicApi } from '#actions/projects/public_api'
import { BaseCommand } from '#actions/tasks/base_command'
import { buildTaskPermissionContext } from '#actions/tasks/support/task_permission_context_builder'
import type { TaskAccessRevokedEvent } from '#events/event_types'
import NotFoundException from '#exceptions/not_found_exception'
import CacheService from '#infra/cache/cache_service'
import loggerService from '#infra/logger/logger_service'
import TaskAssignmentRepository from '#infra/tasks/repositories/task_assignment_repository'
import { AuditAction, EntityType } from '#modules/audit/constants/audit_constants'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
} from '#modules/notifications/constants/notification_constants'
import { AssignmentStatus } from '#modules/tasks/constants/task_constants'
import { canRevokeAssignment } from '#modules/tasks/domain/task_assignment_rules'
import { canRevokeTaskAccess } from '#modules/tasks/domain/task_permission_policy'
import type { DatabaseId } from '#types/database'
import type { ExecutionContext } from '#types/execution_context'
import type { TaskAssignmentWithDetailsRecord } from '#types/task_records'

/**
 * DTO for revoking task access
 */
export interface RevokeTaskAccessDTO {
  assignment_id: DatabaseId
  reason: string
}

interface RevokeNotificationPlan {
  taskId: DatabaseId
  assigneeId: DatabaseId
  assigneeName: string
  projectId: DatabaseId | null
  revokerId: DatabaseId
  reason: string
}

interface RevokeTaskAccessResult {
  assignmentId: DatabaseId
  taskId: DatabaseId
  notificationPlan: RevokeNotificationPlan
  event: TaskAccessRevokedEvent
}

type ActiveAssignmentRecord = TaskAssignmentWithDetailsRecord

/**
 * Command: Revoke Task Access
 *
 * Migrate từ stored procedure: revoke_task_access
 *
 * Business rules:
 * - Chỉ project manager/owner hoặc org admin/owner có thể revoke
 * - Chỉ revoke được assignments đang active
 * - Phải cung cấp lý do
 * - Notify cho assignee và project managers
 */
export default class RevokeTaskAccessCommand extends BaseCommand<RevokeTaskAccessDTO> {
  private notificationService: NotificationCreator

  constructor(execCtx: ExecutionContext, createNotification: NotificationCreator) {
    super(execCtx)
    this.notificationService = createNotification
  }

  async handle(dto: RevokeTaskAccessDTO): Promise<void> {
    const userId = this.getCurrentUserId()
    const result = await this.executeInTransaction(async (trx: TransactionClientContract) => {
      const assignmentRecord = await this.loadAssignmentRecord(dto.assignment_id, trx)

      await this.ensureAssignmentCanBeRevoked(assignmentRecord, dto.reason, userId, trx)
      await this.cancelAssignment(dto.assignment_id, dto.reason, userId, trx)
      await this.logRevokeAudit(dto.assignment_id, assignmentRecord, dto.reason)

      return this.buildRevokeResult(dto.assignment_id, assignmentRecord, dto.reason, userId)
    })

    await this.sendNotifications(result.notificationPlan)
    await CacheService.deleteByPattern(`task:${result.taskId}:*`)
    await CacheService.deleteByPattern(`task:user:*`)
    void emitter.emit('task:access:revoked', result.event)
  }

  private async loadAssignmentRecord(
    assignmentId: DatabaseId,
    trx: TransactionClientContract
  ): Promise<ActiveAssignmentRecord> {
    const assignmentRecord = await TaskAssignmentRepository.findActiveWithDetails(assignmentId, trx)

    if (!assignmentRecord) {
      throw new NotFoundException('Assignment không tồn tại')
    }

    return assignmentRecord
  }

  private async ensureAssignmentCanBeRevoked(
    assignmentRecord: ActiveAssignmentRecord,
    reason: string,
    userId: DatabaseId,
    trx: TransactionClientContract
  ): Promise<void> {
    enforcePolicy(
      canRevokeAssignment({
        assignmentStatus: assignmentRecord.assignment_status,
        reason,
      })
    )

    const permissionContext = await buildTaskPermissionContext(userId, assignmentRecord.task, trx)
    enforcePolicy(canRevokeTaskAccess(permissionContext))
  }

  private async cancelAssignment(
    assignmentId: DatabaseId,
    reason: string,
    userId: DatabaseId,
    trx: TransactionClientContract
  ): Promise<void> {
    await TaskAssignmentRepository.cancelAssignment(
      assignmentId,
      `REVOKED - Lý do: ${reason} | Revoked by user_id: ${userId} | Revoked at: ${new Date().toISOString()}`,
      trx
    )
  }

  private async logRevokeAudit(
    assignmentId: DatabaseId,
    assignmentRecord: ActiveAssignmentRecord,
    reason: string
  ): Promise<void> {
    if (this.execCtx.userId) {
      await auditPublicApi.write(this.execCtx, {
        user_id: this.execCtx.userId,
        action: AuditAction.REVOKE_ACCESS,
        entity_type: EntityType.TASK_ASSIGNMENT,
        entity_id: assignmentId,
        old_values: {
          status: AssignmentStatus.ACTIVE,
          assignee_id: assignmentRecord.assignee_id,
          assignment_type: assignmentRecord.assignment_type,
        },
        new_values: {
          status: AssignmentStatus.CANCELLED,
          reason,
        },
      })
    }
  }

  private buildRevokeResult(
    assignmentId: DatabaseId,
    assignmentRecord: ActiveAssignmentRecord,
    reason: string,
    userId: DatabaseId
  ): RevokeTaskAccessResult {
    return {
      assignmentId,
      taskId: assignmentRecord.task_id,
      notificationPlan: {
        taskId: assignmentRecord.task_id,
        assigneeId: assignmentRecord.assignee_id,
        assigneeName: assignmentRecord.assignee.username,
        projectId: assignmentRecord.task.project_id,
        revokerId: userId,
        reason,
      },
      event: {
        taskId: assignmentRecord.task_id,
        userId: assignmentRecord.assignee_id,
        revokedBy: userId,
        reason,
      },
    }
  }

  private async sendNotifications(plan: RevokeNotificationPlan): Promise<void> {
    try {
      await this.notificationService.handle({
        user_id: plan.assigneeId,
        title: 'Quyền truy cập task đã bị thu hồi',
        message: `Quyền truy cập của bạn vào task đã bị thu hồi. Lý do: ${plan.reason}`,
        type: BACKEND_NOTIFICATION_TYPES.TASK_ACCESS_REVOKED,
        related_entity_type: BACKEND_NOTIFICATION_ENTITY_TYPES.TASK,
        related_entity_id: plan.taskId,
      })

      if (!plan.projectId) {
        return
      }

      const managerIds = await projectPublicApi.findManagerOrOwnerIds(
        plan.projectId,
        plan.revokerId
      )

      for (const managerId of managerIds) {
        await this.notificationService.handle({
          user_id: managerId,
          title: 'Task assignment đã bị revoke',
          message: `Assignment của ${plan.assigneeName} đã bị revoke. Task cần được reassign.`,
          type: BACKEND_NOTIFICATION_TYPES.ASSIGNMENT_REVOKED_NEED_ACTION,
          related_entity_type: BACKEND_NOTIFICATION_ENTITY_TYPES.TASK,
          related_entity_id: plan.taskId,
        })
      }
    } catch (error) {
      loggerService.error('[RevokeTaskAccessCommand] Failed to send notifications:', error)
    }
  }
}
