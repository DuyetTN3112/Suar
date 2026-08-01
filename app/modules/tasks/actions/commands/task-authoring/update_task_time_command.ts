import type UpdateTaskTimeDTO from '../../dtos/request/update_task_time_dto.js'

import { AuditAction, EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { BaseCommand } from '#modules/tasks/actions/base_command'
import { settleTaskPostCommitEffects } from '#modules/tasks/actions/commands/internal/settle_task_post_commit_effects'
import type { TaskCachePort } from '#modules/tasks/actions/ports/outbound/task_cache_port'
import type { TaskEventPublisher } from '#modules/tasks/actions/ports/outbound/task_event_publisher'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { buildTaskPermissionContext } from '#modules/tasks/actions/task_permission_context'
import { canUpdateTaskTime } from '#modules/tasks/domain/task-assignment/task_permission_policy'
import type { TaskRecord, TaskDetailRecord } from '#modules/tasks/types/task_records'

interface TaskTimeMutation {
  task: TaskRecord
  oldValues: {
    estimated_time: number
    actual_time: number
  }
}

interface PersistedTaskTimeUpdate extends TaskTimeMutation {
  detail: TaskDetailRecord
}

function normalizeNullableNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return 0
}

/**
 * Command để cập nhật thời gian của task
 *
 * Business Rules:
 * - Update estimated_time và/hoặc actual_time
 * - Set updated_by
 * - Audit log đầy đủ
 *
 * Pattern: FETCH → DECIDE → PERSIST
 */
export default class UpdateTaskTimeCommand extends BaseCommand<
  UpdateTaskTimeDTO,
  TaskDetailRecord
> {
  constructor(
    execCtx: TaskActionContext,
    private taskExternalDependencies: TaskExternalDependencies,
    private cache: TaskCachePort,
    private readonly taskEventPublisher: TaskEventPublisher
  ) {
    super(execCtx, taskExternalDependencies.transactions)
  }

  /**
   * Execute command để update time
   */
  async handle(dto: UpdateTaskTimeDTO): Promise<TaskDetailRecord> {
    const userId = this.requireUserId()
    const updateResult = await this.persistTaskTimeUpdateInTransaction(dto, userId)
    await this.runPostCommitEffects(updateResult, userId)
    return updateResult.detail
  }

  execute(dto: UpdateTaskTimeDTO): Promise<TaskDetailRecord> {
    return this.handle(dto)
  }

  private requireUserId(): string {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    return userId
  }

  private async persistTaskTimeUpdateInTransaction(
    dto: UpdateTaskTimeDTO,
    userId: string
  ): Promise<PersistedTaskTimeUpdate> {
    return this.taskExternalDependencies.transactions.run(async (trx) => {
      const task = await this.taskExternalDependencies.lifecycle.lockActiveTask(
        dto.task_id,
        trx
      )
      await this.ensureTimeUpdatePermission(task, userId, trx)
      const updateResult = await this.persistTaskTimeUpdate(task, dto, userId, trx)
      const detail = await this.taskExternalDependencies.lifecycle.findTaskDetail(
        dto.task_id,
        trx
      )
      return { ...updateResult, detail }
    })
  }

  private async ensureTimeUpdatePermission(
    task: TaskRecord,
    userId: string,
    trx: TaskTransaction
  ): Promise<void> {
    const permissionContext = await buildTaskPermissionContext(
      userId,
      task,
      trx,
     this.taskExternalDependencies.permission
      , this.taskExternalDependencies.activeAssignmentReader
    )
    enforcePolicy(canUpdateTaskTime(permissionContext))
  }

  private async persistTaskTimeUpdate(
    task: TaskRecord,
    dto: UpdateTaskTimeDTO,
    userId: string,
    trx: TaskTransaction
  ): Promise<TaskTimeMutation> {
    const oldValues = {
      estimated_time: normalizeNullableNumber(task.estimated_time),
      actual_time: normalizeNullableNumber(task.actual_time),
    }

    const updatedTask = await this.taskExternalDependencies.lifecycle.updateTask(
      task.id,
      {
        ...dto.toObject(),
        updated_by: userId,
      },
      trx
    )
    await this.recordTaskTimeUpdatedAudit(updatedTask, oldValues, userId, trx)

    return {
      task: updatedTask,
      oldValues,
    }
  }

  private async recordTaskTimeUpdatedAudit(
    task: TaskRecord,
    oldValues: TaskTimeMutation['oldValues'],
    userId: string,
    trx: TaskTransaction
  ): Promise<void> {
    await auditPublicApi.log(
      {
        user_id: userId,
        action: AuditAction.UPDATE_TIME,
        entity_type: EntityType.TASK,
        entity_id: task.id,
        old_values: oldValues,
        new_values: {
          estimated_time: task.estimated_time,
          actual_time: task.actual_time,
        },
      },
      this.execCtx,
      { trx, critical: true }
    )
  }

  private async runPostCommitEffects(
    updateResult: PersistedTaskTimeUpdate,
    userId: string
  ): Promise<void> {
    await settleTaskPostCommitEffects({
      operation: 'task.time.update',
      context: {
        taskId: updateResult.task.id,
        actorId: userId,
      },
      effects: [
        {
          name: `cache.task.invalidate_now.${updateResult.task.id}`,
          run: () =>
            this.cache.invalidateAfterTaskUpdated(
              updateResult.task.id,
              updateResult.task.organization_id
            ),
        },
        {
          name: `event.task_updated.${updateResult.task.id}`,
          run: () =>
            this.taskEventPublisher.publishTaskUpdated({
              taskId: updateResult.task.id,
              organizationId: updateResult.task.organization_id,
              updatedBy: userId,
              changes: {
                estimated_time: updateResult.task.estimated_time,
                actual_time: updateResult.task.actual_time,
              },
              previousValues: updateResult.oldValues,
            }),
        },
      ],
    })
  }
}
