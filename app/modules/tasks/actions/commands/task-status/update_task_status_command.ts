import type UpdateTaskStatusDTO from '../../dtos/request/update_task_status_dto.js'

import { stageStatusChangeNotification } from './internal/task_status_notification_stager.js'
import {
  ensureStatusUpdatePermission,
  resolveNewStatus,
} from './internal/task_status_transition_validator.js'

import { AuditAction, EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { BaseCommand } from '#modules/tasks/actions/base_command'
import { settleTaskPostCommitEffects } from '#modules/tasks/actions/commands/internal/settle_task_post_commit_effects'
import type CompleteTaskAssignmentsCommand from '#modules/tasks/actions/commands/task-assignment/complete_task_assignments_command'
import type { TaskCachePort } from '#modules/tasks/actions/ports/outbound/task_cache_port'
import type { TaskEventPublisher } from '#modules/tasks/actions/ports/outbound/task_event_publisher'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type { TaskNotificationStager } from '#modules/tasks/actions/ports/outbound/task_notification_stager'
import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { toLegacyTaskStatusMirror } from '#modules/tasks/domain/task-status/task_status_mirror'
import type {
  TaskDetailRecord,
  TaskRecord,
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
export default class UpdateTaskStatusCommand extends BaseCommand<
  UpdateTaskStatusDTO,
  TaskDetailRecord
> {
  constructor(
    execCtx: TaskActionContext,
    private taskExternalDependencies: TaskExternalDependencies,
    private notificationStager: TaskNotificationStager,
    private cache: TaskCachePort,
    private readonly taskEventPublisher: TaskEventPublisher,
    private readonly completeTaskAssignments: CompleteTaskAssignmentsCommand
  ) {
    super(execCtx, taskExternalDependencies.transactions)
  }

  /**
   * Execute command để update status
   */
  async handle(dto: UpdateTaskStatusDTO): Promise<TaskDetailRecord> {
    const userId = this.requireUserId()
    const updateResult = await this.persistStatusUpdateInTransaction(dto, userId)
    await this.runPostCommitEffects(updateResult, userId, dto)
    return updateResult.detail
  }

  execute(dto: UpdateTaskStatusDTO): Promise<TaskDetailRecord> {
    return this.handle(dto)
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

    const sourceRevision = updatedTask.updated_at ?? updatedTask.created_at
    if (this.taskExternalDependencies.searchProjectionInvalidation && sourceRevision) {
      await this.taskExternalDependencies.searchProjectionInvalidation.stage({
        taskId: updatedTask.id,
        operation: 'upsert',
        sourceRevision,
        changedFields: ['status', 'task_status_id', 'updated_by', 'updated_at'],
      }, trx)
    }

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

    await stageStatusChangeNotification(
      updatedTask,
      userId,
      dto,
      oldTaskStatusId,
      newStatus,
      this.taskExternalDependencies,
      this.notificationStager,
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
      const newStatus = await resolveNewStatus(
        task,
        dto,
        this.taskExternalDependencies,
        trx
      )
      const oldTaskStatusId = await ensureStatusUpdatePermission(
        task,
        dto,
        userId,
        newStatus,
        this.taskExternalDependencies,
        trx
      )
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
