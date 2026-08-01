import type AssignTaskDTO from '../dtos/request/assign_task_dto.js'

import { AuditAction, EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
  type BackendNotificationType,
} from '#modules/notifications/public_contracts/notification_constants'
import { buildNotificationEventId } from '#modules/notifications/public_contracts/notification_event_identity'
import { PLATFORM_EVENT_NAMES } from '#modules/observability/public_contracts/platform_event_names'
import {
  platformOperationalLogger,
  platformWorkflowLogger,
} from '#modules/observability/public_contracts/platform_observability'
import type { TaskCachePort } from '#modules/tasks/actions/ports/outbound/task_cache_port'
import type { TaskEventPublisher } from '#modules/tasks/actions/ports/outbound/task_event_publisher'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type { TaskNotificationStager } from '#modules/tasks/actions/ports/outbound/task_notification_stager'
import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'
import { synchronizeTaskAssignment } from '#modules/tasks/actions/services/task_assignment_synchronizer'
import { buildTaskPermissionContext } from '#modules/tasks/actions/services/task_permission_context_resolver'
import { settleTaskPostCommitEffects } from '#modules/tasks/actions/services/task_post_commit_effect_settler'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { validateAssignee } from '#modules/tasks/domain/task_assignment_rules'
import { canAssignTask } from '#modules/tasks/domain/task_permission_policy'
import { buildTaskAssignmentEvent } from '#modules/tasks/observability/task_event_factory'
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
 * - User phải thuộc cùng organization hoặc là external contributor
 * - Notification gửi cho assignee mới (và có thể old assignee)
 * - Audit log đầy đủ
 *
 * Pattern: FETCH → DECIDE → PERSIST → POST-COMMIT
 */
export default class AssignTaskCommand {
  constructor(
    protected execCtx: TaskActionContext,
    private notificationStager: TaskNotificationStager,
    private taskExternalDependencies: TaskExternalDependencies,
    private cache: TaskCachePort,
    private readonly taskEventPublisher: TaskEventPublisher
  ) {}

  async execute(dto: AssignTaskDTO): Promise<TaskDetailRecord> {
    const userId = this.requireUserId()
    const startedAt = Date.now()
    const assignmentAction: 'assign' | 'reassign' | 'unassign' = dto.isUnassigning()
      ? 'unassign'
      : dto.assigned_to
        ? 'assign'
        : 'unassign'

    platformOperationalLogger.log(
      'info',
      buildTaskAssignmentEvent(this.execCtx, {
        eventName: PLATFORM_EVENT_NAMES.TASK_ASSIGNMENT_STARTED,
        stage: 'started',
        outcome: 'success',
        taskId: dto.task_id,
        assigneeId: dto.assigned_to,
        assignmentAction,
      })
    )

    try {
      const assignmentResult = await this.persistAssignmentInTransaction(dto, userId)
      const finalizedAction: 'assign' | 'reassign' | 'unassign' = dto.isUnassigning()
        ? 'unassign'
        : assignmentResult.oldAssignedTo && assignmentResult.oldAssignedTo !== dto.assigned_to
          ? 'reassign'
          : 'assign'

      await this.runPostCommitEffects(assignmentResult, dto, userId)
      await platformWorkflowLogger.checkpointSafely(
        this.execCtx,
        buildTaskAssignmentEvent(this.execCtx, {
          eventName: PLATFORM_EVENT_NAMES.TASK_ASSIGNMENT_COMPLETED,
          stage: 'completed',
          outcome: 'success',
          taskId: dto.task_id,
          assigneeId: dto.assigned_to,
          previousAssigneeId: assignmentResult.oldAssignedTo,
          assignmentAction: finalizedAction,
          runtime: {
            duration_ms: Date.now() - startedAt,
          },
        })
      )

      return await this.taskExternalDependencies.lifecycle.findTaskDetail(
        assignmentResult.task.id
      )
    } catch (error) {
      await platformWorkflowLogger.checkpointSafely(
        this.execCtx,
        buildTaskAssignmentEvent(this.execCtx, {
          eventName: PLATFORM_EVENT_NAMES.TASK_ASSIGNMENT_FAILED,
          stage: 'failed',
          outcome: 'failure',
          taskId: dto.task_id,
          assigneeId: dto.assigned_to,
          assignmentAction,
          runtime: {
            duration_ms: Date.now() - startedAt,
          },
          error,
        })
      )
      throw error
    }
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
    trx: TaskTransaction
  ): Promise<TaskRecord> {
    return this.taskExternalDependencies.lifecycle.lockActiveTask(taskId, trx)
  }

  private async ensureAssignmentPreconditions(
    userId: string,
    dto: AssignTaskDTO,
    task: TaskRecord,
    trx: TaskTransaction
  ): Promise<void> {
    const permissionContext = await buildTaskPermissionContext(
      userId,
      task,
      trx,
      this.taskExternalDependencies.permission
      , this.taskExternalDependencies.activeAssignmentReader
    )
    enforcePolicy(canAssignTask(permissionContext))

    if (!dto.isAssigning() || dto.assigned_to === null) {
      return
    }

    const assignee = await this.taskExternalDependencies.user.findUserIdentity(dto.assigned_to, trx)
    if (!assignee) {
      throw new NotFoundException('Người được giao không tồn tại')
    }

    const isMember = await this.taskExternalDependencies.org.isApprovedMember(
      dto.assigned_to,
      task.organization_id,
      trx
    )
    const isExternalContributor = await this.taskExternalDependencies.user.isExternalContributor(
      dto.assigned_to,
      trx
    )

    enforcePolicy(
      validateAssignee({
        isOrgMember: isMember,
        isExternalContributor,
        taskVisibility: task.task_visibility ?? 'public',
      })
    )
  }

  private async persistAssignment(
    task: TaskRecord,
    dto: AssignTaskDTO,
    userId: string,
    trx: TaskTransaction
  ): Promise<PersistedTaskAssignment> {
    const oldAssignedTo = task.assigned_to
    const oldValues = { ...task }

    // Sync assignment lifecycle: task_assignments + tasks.assigned_to cache
    await synchronizeTaskAssignment(
      {
        taskId: task.id,
        assigneeId: dto.assigned_to,
        assignedBy: userId,
      },
      trx,
      this.taskExternalDependencies.assignments,
      this.taskExternalDependencies.lifecycle
    )

    // Fetch updated task for audit
    const updatedTask = await this.taskExternalDependencies.lifecycle.lockActiveTask(
      task.id,
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
      this.execCtx,
      { trx, critical: true }
    )

    if (dto.shouldNotify()) {
      await this.stageAssignmentNotifications(updatedTask, userId, dto, oldAssignedTo, trx)
    }

    return {
      task: updatedTask,
      oldAssignedTo,
    }
  }

  private async persistAssignmentInTransaction(
    dto: AssignTaskDTO,
    userId: string
  ): Promise<PersistedTaskAssignment> {
    return this.taskExternalDependencies.transactions.run(async (trx) => {
      const task = await this.loadTaskForAssignment(dto.task_id, trx)
      await this.ensureAssignmentPreconditions(userId, dto, task, trx)
      return this.persistAssignment(task, dto, userId, trx)
    })
  }

  private async runPostCommitEffects(
    result: PersistedTaskAssignment,
    dto: AssignTaskDTO,
    userId: string
  ): Promise<void> {
    const assignedTo = dto.assigned_to

    await settleTaskPostCommitEffects({
      operation: 'task.assign',
      context: {
        taskId: result.task.id,
        actorId: userId,
      },
      effects: [
        ...(dto.isAssigning() && assignedTo !== null
          ? [
              {
                name: 'event.task_assigned',
                run: () =>
                  this.taskEventPublisher.publishTaskAssigned({
                    taskId: result.task.id,
                    organizationId: result.task.organization_id,
                    assigneeId: assignedTo,
                    assignedBy: userId,
                    assignmentType: 'assign',
                  }),
              },
            ]
          : []),
        {
          name: 'cache.invalidate_after_assignment',
          run: () =>
            this.cache.invalidateAfterTaskAssigned(result.task.id, result.task.organization_id),
        },
      ],
    })
  }

  private async stageAssignmentNotifications(
    task: TaskRecord,
    assignerId: string,
    dto: AssignTaskDTO,
    oldAssignedTo: string | null,
    trx: TaskTransaction
  ): Promise<void> {
    const occurredAt = task.updated_at
    if (!occurredAt) {
      throw new InvariantViolationException(
        'Persisted task assignment transition is missing its update timestamp'
      )
    }
    const assigner = await this.taskExternalDependencies.user.findUserIdentity(assignerId, trx)
    const assignerName = assigner?.username ?? assigner?.email ?? 'Unknown'
    const plan: Array<{
      recipientId: string
      type: BackendNotificationType
      eventName: string
      assignmentChange: 'assigned' | 'unassigned' | 'reassigned'
    }> = []

    if (dto.isUnassigning() && oldAssignedTo && oldAssignedTo !== assignerId) {
      plan.push({
        recipientId: oldAssignedTo,
        type: BACKEND_NOTIFICATION_TYPES.TASK_UNASSIGNED,
        eventName: 'task.unassigned',
        assignmentChange: 'unassigned',
      })
    }

    if (dto.isAssigning() && dto.assigned_to !== null && dto.assigned_to !== assignerId) {
      plan.push({
        recipientId: dto.assigned_to,
        type: BACKEND_NOTIFICATION_TYPES.TASK_ASSIGNED,
        eventName: 'task.assigned',
        assignmentChange: 'assigned',
      })
      if (oldAssignedTo && oldAssignedTo !== dto.assigned_to && oldAssignedTo !== assignerId) {
        plan.push({
          recipientId: oldAssignedTo,
          type: BACKEND_NOTIFICATION_TYPES.TASK_REASSIGNED,
          eventName: 'task.reassigned',
          assignmentChange: 'reassigned',
        })
      }
    }

    for (const notification of plan) {
      await this.notificationStager.stage(
        {
          eventId: buildNotificationEventId({
            eventName: notification.eventName,
            businessEventId: `${task.id}:${oldAssignedTo ?? 'none'}:${dto.assigned_to ?? 'none'}:${occurredAt}`,
            recipientId: notification.recipientId,
          }),
          schemaVersion: 1,
          type: notification.type,
          recipientId: notification.recipientId,
          scope: { kind: 'organization', id: task.organization_id },
          actor: { type: 'user', id: assignerId },
          subject: {
            type: BACKEND_NOTIFICATION_ENTITY_TYPES.TASK,
            id: task.id,
          },
          parameters: {
            taskTitle: task.title,
            assignerName,
            assignmentChange: notification.assignmentChange,
            ...(dto.reason === undefined ? {} : { reason: dto.reason }),
          },
          occurredAt,
          correlationId: `${task.id}:${occurredAt}`,
        },
        { trx }
      )
    }
  }
}
