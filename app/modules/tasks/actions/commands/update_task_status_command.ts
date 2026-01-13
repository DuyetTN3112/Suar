import type UpdateTaskStatusDTO from '../dtos/request/update_task_status_dto.js'

import { AuditAction, EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import PersistedDataIntegrityException from '#modules/errors/public_contracts/persisted_data_integrity_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
} from '#modules/notifications/public_contracts/notification_constants'
import { buildNotificationEventId } from '#modules/notifications/public_contracts/notification_event_identity'
import type CompleteTaskAssignmentsCommand from '#modules/tasks/actions/commands/complete_task_assignments_command'
import type { TaskCachePort } from '#modules/tasks/actions/ports/outbound/task_cache_port'
import type { TaskEventPublisher } from '#modules/tasks/actions/ports/outbound/task_event_publisher'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type { TaskNotificationStager } from '#modules/tasks/actions/ports/outbound/task_notification_stager'
import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'
import { buildTaskPermissionContext } from '#modules/tasks/actions/services/task_permission_context_resolver'
import { settleTaskPostCommitEffects } from '#modules/tasks/actions/services/task_post_commit_effect_settler'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { canUpdateTaskStatus } from '#modules/tasks/domain/task_permission_policy'
import { toLegacyTaskStatusMirror } from '#modules/tasks/domain/task_status_mirror'
import { validateWorkflowTransition } from '#modules/tasks/domain/task_status_rules'
import type {
  TaskRecord,
  TaskDetailRecord,
  TaskStatusRecord,
} from '#modules/tasks/types/task_records'

type ResolvedTaskStatus = TaskStatusRecord

interface TaskStatusMutation {
  task: TaskRecord
  oldStatus: string
  oldTaskStatusId: string
  newStatus: ResolvedTaskStatus
}

interface PersistedTaskStatusUpdate extends TaskStatusMutation {
  detail: TaskDetailRecord
}

/**
 * Command để cập nhật trạng thái task
 *
 * Business Rules:
 * - Validate status transition via DB-driven workflow (task_workflow_transitions)
 * - Set updated_by
 * - Notify creator nếu status thay đổi
 * - Audit log đầy đủ
 * - Sets both task_status_id (v4) and status slug (backward compat)
 *
 * Pattern: FETCH → DECIDE → PERSIST
 */
export default class UpdateTaskStatusCommand {
  constructor(
    protected execCtx: TaskActionContext,
    private taskExternalDependencies: TaskExternalDependencies,
    private notificationStager: TaskNotificationStager,
    private cache: TaskCachePort,
    private readonly taskEventPublisher: TaskEventPublisher,
    private readonly completeTaskAssignments: CompleteTaskAssignmentsCommand
  ) {}

  /**
   * Execute command để update status
   */
  async execute(dto: UpdateTaskStatusDTO): Promise<TaskDetailRecord> {
    const userId = this.requireUserId()
    const updateResult = await this.persistStatusUpdateInTransaction(dto, userId)
    await this.runPostCommitEffects(updateResult, userId, dto)
    return updateResult.detail
  }

  private async stageStatusChangeNotification(
    task: TaskRecord,
    updaterId: string,
    dto: UpdateTaskStatusDTO,
    oldTaskStatusId: string,
    newStatus: ResolvedTaskStatus,
    trx: TaskTransaction
  ): Promise<void> {
    if (!task.creator_id || task.creator_id === updaterId) {
      return
    }

    const occurredAt = task.updated_at
    if (!occurredAt) {
      throw new InvariantViolationException(
        'Persisted task status transition is missing its update timestamp'
      )
    }
    const updater = await this.taskExternalDependencies.user.findUserIdentity(updaterId, trx)
    const updaterName = updater?.username ?? updater?.email ?? 'Unknown'
    await this.notificationStager.stage(
      {
        eventId: buildNotificationEventId({
          eventName: 'task.status_updated',
          businessEventId: `${task.id}:${oldTaskStatusId}:${newStatus.id}:${occurredAt}`,
          recipientId: task.creator_id,
        }),
        schemaVersion: 1,
        type: BACKEND_NOTIFICATION_TYPES.TASK_STATUS_UPDATED,
        recipientId: task.creator_id,
        scope: { kind: 'organization', id: task.organization_id },
        actor: { type: 'user', id: updaterId },
        subject: {
          type: BACKEND_NOTIFICATION_ENTITY_TYPES.TASK,
          id: task.id,
        },
        parameters: {
          taskTitle: task.title,
          updaterName,
          newStatusName: newStatus.name,
          ...(dto.reason === undefined ? {} : { reason: dto.reason }),
        },
        occurredAt,
        correlationId: `${task.id}:${occurredAt}`,
      },
      { trx }
    )
  }

  private requireUserId(): string {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    return userId
  }

  private async loadTaskForStatusUpdate(taskId: string, trx: TaskTransaction): Promise<TaskRecord> {
    return this.taskExternalDependencies.lifecycle.lockActiveTask(taskId, trx)
  }

  private async resolveNewStatus(
    task: TaskRecord,
    dto: UpdateTaskStatusDTO,
    trx: TaskTransaction
  ): Promise<ResolvedTaskStatus> {
    const newStatus = await this.taskExternalDependencies.lifecycle.findActiveStatus(
      dto.task_status_id,
      task.organization_id,
      trx
    )

    if (!newStatus) {
      throw NotFoundException.resource('Task status', dto.task_status_id)
    }

    return newStatus
  }

  private async ensureStatusUpdatePermission(
    task: TaskRecord,
    dto: UpdateTaskStatusDTO,
    userId: string,
    trx: TaskTransaction
  ): Promise<string> {
    const currentStatusId = task.task_status_id
    if (!currentStatusId) {
      throw new PersistedDataIntegrityException(
        'Persisted task is missing task_status_id required for a status transition',
        {
          taskId: task.id,
          organizationId: task.organization_id,
        }
      )
    }

    const permissionContext = await buildTaskPermissionContext(
      userId,
      task,
      trx,
      this.taskExternalDependencies.permission,
      this.taskExternalDependencies.activeAssignmentReader
    )
    enforcePolicy(canUpdateTaskStatus(permissionContext))

    const transitions =
      await this.taskExternalDependencies.lifecycle.findWorkflowTransitionsFromStatus(
        task.organization_id,
        currentStatusId,
        trx
      )
    const organizationTransitions =
      transitions.length > 0
        ? transitions
        : await this.taskExternalDependencies.lifecycle.listWorkflowTransitions(
            task.organization_id,
            trx
          )
    const workflowConfigured = transitions.length > 0 || organizationTransitions.length > 0
    const matchingTransition = transitions.find(
      (transition) => transition.to_status_id === dto.task_status_id
    )

    enforcePolicy(
      validateWorkflowTransition({
        currentStatusId,
        newStatusId: dto.task_status_id,
        allowedTargetIds: transitions.map((transition) => transition.to_status_id),
        workflowConfigured,
        conditions: matchingTransition?.conditions ?? {},
        isAssigned: task.assigned_to !== null,
      })
    )

    return currentStatusId
  }

  private async persistStatusChange(
    task: TaskRecord,
    dto: UpdateTaskStatusDTO,
    userId: string,
    oldTaskStatusId: string,
    newStatus: ResolvedTaskStatus,
    trx: TaskTransaction
  ): Promise<TaskStatusMutation> {
    const oldStatus = task.status

    const updatedTask = await this.taskExternalDependencies.lifecycle.updateTask(
      task.id,
      {
        task_status_id: dto.task_status_id,
        status: toLegacyTaskStatusMirror(newStatus),
        updated_by: userId,
      },
      trx
    )

    await auditPublicApi.log(
      {
        user_id: userId,
        action: AuditAction.UPDATE_STATUS,
        entity_type: EntityType.TASK,
        entity_id: dto.task_id,
        old_values: { status: oldStatus },
        new_values: {
          status: toLegacyTaskStatusMirror(newStatus),
          task_status_id: dto.task_status_id,
        },
      },
      this.execCtx,
      { trx, critical: true }
    )

    await this.stageStatusChangeNotification(
      updatedTask,
      userId,
      dto,
      oldTaskStatusId,
      newStatus,
      trx
    )

    return {
      task: updatedTask,
      oldStatus,
      oldTaskStatusId,
      newStatus,
    }
  }

  private async persistStatusUpdateInTransaction(
    dto: UpdateTaskStatusDTO,
    userId: string
  ): Promise<PersistedTaskStatusUpdate> {
    return this.taskExternalDependencies.transactions.run(async (trx) => {
      const task = await this.loadTaskForStatusUpdate(dto.task_id, trx)
      const newStatus = await this.resolveNewStatus(task, dto, trx)
      const oldTaskStatusId = await this.ensureStatusUpdatePermission(task, dto, userId, trx)
      await this.ensureSubmissionIfDone(task, newStatus, trx)
      const mutation = await this.persistStatusChange(
        task,
        dto,
        userId,
        oldTaskStatusId,
        newStatus,
        trx
      )
      if (oldTaskStatusId !== newStatus.id && newStatus.category === 'done') {
        await this.completeTaskAssignments.execute(
          {
            taskId: mutation.task.id,
            assignedTo: mutation.task.assigned_to,
            changedBy: userId,
          },
          trx
        )
      }
      const detail = await this.taskExternalDependencies.lifecycle.findTaskDetail(
        mutation.task.id,
        trx
      )
      return { ...mutation, detail }
    })
  }

  private async ensureSubmissionIfDone(
    task: TaskRecord,
    newStatus: ResolvedTaskStatus,
    trx: TaskTransaction
  ): Promise<void> {
    if (newStatus.category === 'done') {
      const bypassTypes = [
        'research_spike',
        'poc',
        'prototype',
        'technical_writing',
        'documentation',
        'knowledge_transfer',
        'mentoring',
        'product_management',
      ]
      if (task.task_type && bypassTypes.includes(task.task_type)) {
        return
      }

      if (!(await this.taskExternalDependencies.lifecycle.hasReviewableSubmission(task.id, trx))) {
        throw new ConflictException(
          'Task cannot move to DONE without a valid submission (submitted, accepted_for_review, or locked)'
        )
      }
    }
  }

  private async runPostCommitEffects(
    updateResult: PersistedTaskStatusUpdate,
    userId: string,
    dto: UpdateTaskStatusDTO
  ): Promise<void> {
    const statusChangedEvent =
      updateResult.oldTaskStatusId !== dto.task_status_id
        ? {
            taskId: updateResult.task.id,
            organizationId: updateResult.task.organization_id,
            assignedTo: updateResult.task.assigned_to,
            oldStatus: updateResult.oldStatus,
            newStatusId: dto.task_status_id,
            newStatus: updateResult.newStatus.slug,
            newStatusCategory: updateResult.newStatus.category,
            changedBy: userId,
          }
        : null

    await settleTaskPostCommitEffects({
      operation: 'task.status.update',
      context: {
        taskId: updateResult.task.id,
        targetTaskStatusId: dto.task_status_id,
        actorId: userId,
      },
      effects: [
        ...(statusChangedEvent
          ? [
              {
                name: `event.task_status_changed.${updateResult.task.id}`,
                run: () => this.taskEventPublisher.publishTaskStatusChanged(statusChangedEvent),
              },
            ]
          : []),
        {
          name: `cache.task.invalidate_now.${dto.task_id}`,
          run: () =>
            this.cache.invalidateAfterTaskUpdated(dto.task_id, updateResult.task.organization_id),
        },
      ],
    })
  }
}
