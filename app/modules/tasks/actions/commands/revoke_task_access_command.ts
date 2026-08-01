import { AuditAction, EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import type { NotificationFanoutStagerContract } from '#modules/notifications/public_contracts/notification_fanout'
import { BaseCommand } from '#modules/tasks/actions/base_command'
import type { TaskCachePort } from '#modules/tasks/actions/ports/outbound/task_cache_port'
import type { TaskEventPublisher } from '#modules/tasks/actions/ports/outbound/task_event_publisher'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type { TaskProjectNotificationAudienceReader } from '#modules/tasks/actions/ports/outbound/task_project_notification_audience_reader'
import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'
import { buildTaskPermissionContext } from '#modules/tasks/actions/services/task_permission_context_resolver'
import { settleTaskPostCommitEffects } from '#modules/tasks/actions/services/task_post_commit_effect_settler'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { canRevokeAssignment } from '#modules/tasks/domain/task_assignment_rules'
import { canRevokeTaskAccess } from '#modules/tasks/domain/task_permission_policy'
import { AssignmentStatus } from '#modules/tasks/public_contracts/task_constants'
import type { TaskAccessRevokedEvent } from '#modules/tasks/public_contracts/task_events'
import type { TaskAssignmentWithTaskRecord } from '#modules/tasks/types/task_records'

/**
 * DTO for revoking task access
 */
export interface RevokeTaskAccessDTO {
  assignment_id: string
  reason: string
}

interface RevokeTaskAccessResult {
  assignmentId: string
  taskId: string
  organizationId: string
  event: TaskAccessRevokedEvent
}

type ActiveAssignmentRecord = TaskAssignmentWithTaskRecord & {
  assignee: {
    id: string
    username: string
  }
}

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
  constructor(
    execCtx: TaskActionContext,
    private readonly notificationFanout: NotificationFanoutStagerContract,
    private taskExternalDependencies: TaskExternalDependencies,
    private readonly projectNotificationAudience: TaskProjectNotificationAudienceReader,
    private cache: TaskCachePort,
    private readonly taskEventPublisher: TaskEventPublisher
  ) {
    super(execCtx, taskExternalDependencies.transactions)
  }

  async handle(dto: RevokeTaskAccessDTO): Promise<void> {
    const userId = this.getCurrentUserId()
    const result = await this.executeInTransaction(async (trx: TaskTransaction) => {
      const now = new Date()
      const assignmentRecord = await this.loadAssignmentRecord(dto.assignment_id, trx)

      await this.ensureAssignmentCanBeRevoked(assignmentRecord, dto.reason, userId, trx)
      await this.cancelAssignment(dto.assignment_id, dto.reason, userId, trx, now)
      await this.logRevokeAudit(dto.assignment_id, assignmentRecord, dto.reason, trx)
      await this.stageRevokeFanout(
        dto.assignment_id,
        assignmentRecord,
        dto.reason,
        userId,
        trx,
        now
      )

      return this.buildRevokeResult(dto.assignment_id, assignmentRecord, dto.reason, userId)
    })

    await settleTaskPostCommitEffects({
      operation: 'task.access.revoke',
      context: {
        taskId: result.taskId,
        assignmentId: result.assignmentId,
        actorId: userId,
      },
      effects: [
        {
          name: 'cache.invalidate_after_access_change',
          run: () =>
            this.cache.invalidateAfterTaskAccessChanged(result.taskId, result.organizationId),
        },
        {
          name: 'event.task_access_revoked',
          run: () => this.taskEventPublisher.publishTaskAccessRevoked(result.event),
        },
      ],
    })
  }

  private async loadAssignmentRecord(
    assignmentId: string,
    trx: TaskTransaction
  ): Promise<ActiveAssignmentRecord> {
    const assignmentRecord =
      await this.taskExternalDependencies.assignments.findWithTaskForUpdate(
        assignmentId,
        trx
      )

    if (!assignmentRecord) {
      throw new NotFoundException('Assignment không tồn tại')
    }

    const assignee = await this.taskExternalDependencies.user.findUserIdentity(
      assignmentRecord.assignee_id,
      trx
    )
    if (!assignee) {
      throw new InvariantViolationException('Task assignment assignee identity is missing')
    }

    return {
      ...assignmentRecord,
      assignee: {
        id: assignee.id,
        username: assignee.username,
      },
    }
  }

  private async ensureAssignmentCanBeRevoked(
    assignmentRecord: ActiveAssignmentRecord,
    reason: string,
    userId: string,
    trx: TaskTransaction
  ): Promise<void> {
    enforcePolicy(
      canRevokeAssignment({
        assignmentStatus: assignmentRecord.assignment_status,
        reason,
      })
    )

    const permissionContext = await buildTaskPermissionContext(
      userId,
      assignmentRecord.task,
      trx,
      this.taskExternalDependencies.permission
      , this.taskExternalDependencies.activeAssignmentReader
    )
    enforcePolicy(canRevokeTaskAccess(permissionContext))
  }

  private async cancelAssignment(
    assignmentId: string,
    reason: string,
    userId: string,
    trx: TaskTransaction,
    now: Date
  ): Promise<void> {
    await this.taskExternalDependencies.assignments.cancel(
      assignmentId,
      `REVOKED - Lý do: ${reason} | Revoked by user_id: ${userId} | Revoked at: ${now.toISOString()}`,
      trx
    )
  }

  private async logRevokeAudit(
    assignmentId: string,
    assignmentRecord: ActiveAssignmentRecord,
    reason: string,
    trx: TaskTransaction
  ): Promise<void> {
    if (this.execCtx.userId) {
      await auditPublicApi.write(
        this.execCtx,
        {
          user_id: this.execCtx.userId,
          action: AuditAction.REVOKE_ACCESS,
          critical: true,
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
        },
        trx
      )
    }
  }

  private buildRevokeResult(
    assignmentId: string,
    assignmentRecord: ActiveAssignmentRecord,
    reason: string,
    userId: string
  ): RevokeTaskAccessResult {
    return {
      assignmentId,
      taskId: assignmentRecord.task_id,
      organizationId: assignmentRecord.task.organization_id,
      event: {
        taskId: assignmentRecord.task_id,
        organizationId: assignmentRecord.task.organization_id,
        userId: assignmentRecord.assignee_id,
        revokedBy: userId,
        reason,
      },
    }
  }

  private async stageRevokeFanout(
    assignmentId: string,
    assignmentRecord: ActiveAssignmentRecord,
    reason: string,
    revokerId: string,
    trx: TaskTransaction,
    now: Date
  ): Promise<void> {
    const shared = {
      schemaVersion: 1 as const,
      scope: {
        kind: 'organization' as const,
        id: assignmentRecord.task.organization_id,
      },
      actor: { type: 'user', id: revokerId },
      subject: { type: 'task', id: assignmentRecord.task_id },
      occurredAt: now.toISOString(),
      ...(this.execCtx.requestId ? { correlationId: this.execCtx.requestId } : {}),
    }
    await this.notificationFanout.stage(
      {
        ...shared,
        eventName: 'task.access_revoked',
        businessEventId: assignmentId,
        type: 'task_access_revoked',
        parameters: {
          reason,
          taskTitle: assignmentRecord.task.title,
        },
      },
      [assignmentRecord.assignee_id],
      { trx, now }
    )

    if (!assignmentRecord.task.project_id) {
      return
    }
    const managerIds = await this.projectNotificationAudience.findManagerOrOwnerIds(
      assignmentRecord.task.project_id,
      revokerId,
      trx
    )
    if (managerIds.length === 0) {
      return
    }
    await this.notificationFanout.stage(
      {
        ...shared,
        eventName: 'task.assignment_revoked_requires_action',
        businessEventId: assignmentId,
        type: 'assignment_revoked_need_action',
        parameters: {
          assigneeName: assignmentRecord.assignee.username,
          taskTitle: assignmentRecord.task.title,
        },
      },
      managerIds,
      { trx, now }
    )
  }
}
