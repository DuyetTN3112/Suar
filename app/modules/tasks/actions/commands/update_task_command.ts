import type UpdateTaskDTO from '../dtos/request/update_task_dto.js'

import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import { BACKEND_NOTIFICATION_ENTITY_TYPES } from '#modules/notifications/public_contracts/notification_constants'
import { buildNotificationEventId } from '#modules/notifications/public_contracts/notification_event_identity'
import { BaseCommand } from '#modules/tasks/actions/base_command'
import {
  buildTaskUpdateNotificationRequests,
  runUpdateTaskPostCommitEffects,
} from '#modules/tasks/actions/commands/internal/update_task_post_commit'
import { persistTaskUpdateWithinTransaction } from '#modules/tasks/actions/commands/internal/update_task_transaction'
import type { TaskCachePort } from '#modules/tasks/actions/ports/outbound/task_cache_port'
import type { TaskEventPublisher } from '#modules/tasks/actions/ports/outbound/task_event_publisher'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type { TaskNotificationStager } from '#modules/tasks/actions/ports/outbound/task_notification_stager'
import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import type { TaskDetailRecord, TaskRecord } from '#modules/tasks/types/task_records'

interface UpdateTaskCommandInput {
  taskId: string
  dto: UpdateTaskDTO
}

interface UpdateTaskCommandDependencies {
  persistTaskUpdateWithinTransaction: typeof persistTaskUpdateWithinTransaction
  runUpdateTaskPostCommitEffects: typeof runUpdateTaskPostCommitEffects
}

const defaultDependencies: UpdateTaskCommandDependencies = {
  persistTaskUpdateWithinTransaction,
  runUpdateTaskPostCommitEffects,
}

/**
 * Command để cập nhật task
 *
 * Business Rules:
 * - Task phải thuộc organization hiện tại
 * - Permission-based updates with field-level restrictions
 * - Track old values cho audit
 * - Version history
 * - Notifications
 *
 * Pattern: FETCH → DECIDE → PERSIST
 */
export default class UpdateTaskCommand extends BaseCommand<
  UpdateTaskCommandInput,
  TaskDetailRecord
> {
  constructor(
    execCtx: TaskActionContext,
    private taskExternalDependencies: TaskExternalDependencies,
    private notificationStager: TaskNotificationStager,
    private cache: TaskCachePort,
    private readonly taskEventPublisher: TaskEventPublisher,
    private dependencies: UpdateTaskCommandDependencies = defaultDependencies
  ) {
    super(execCtx, taskExternalDependencies.transactions)
  }

  /**
   * Execute command để cập nhật task
   *
   * Di chuyển logic từ database triggers:
   * - before_task_update: Validate assignee thuộc org
   * - task_version_after_update: Tạo version history khi có thay đổi
   */
  async handle(input: UpdateTaskCommandInput): Promise<TaskDetailRecord> {
    const userId = this.getCurrentUserId()
    this.ensureHasUpdates(input.dto)
    const updateResult = await this.executeInTransaction(async (trx) => {
      const result = await this.dependencies.persistTaskUpdateWithinTransaction({
        execCtx: this.execCtx,
        taskId: input.taskId,
        dto: input.dto,
        userId,
        trx,
        externalDependencies: this.taskExternalDependencies,
      })
      await this.stageTaskUpdateNotifications(
        result.task,
        result.oldAssignedTo,
        input.dto,
        userId,
        trx
      )
      return result
    })
    await this.dependencies.runUpdateTaskPostCommitEffects(
      updateResult,
      userId,
      this.cache,
      this.taskEventPublisher
    )
    return this.taskExternalDependencies.lifecycle.findTaskDetail(updateResult.task.id)
  }

  async execute(taskId: string, dto: UpdateTaskDTO): Promise<TaskDetailRecord> {
    return await this.handle({ taskId, dto })
  }

  private ensureHasUpdates(dto: UpdateTaskDTO): void {
    if (!dto.hasUpdates()) {
      throw new BusinessLogicException('Không có thay đổi nào để cập nhật')
    }
  }

  private async stageTaskUpdateNotifications(
    task: TaskRecord,
    oldAssignedTo: string | null,
    dto: UpdateTaskDTO,
    updaterId: string,
    trx: TaskTransaction
  ): Promise<void> {
    const plan = buildTaskUpdateNotificationRequests({
      task,
      updaterId,
      hasAssigneeChange: dto.hasAssigneeChange(),
      isUnassigning: dto.isUnassigning(),
      oldAssignedTo,
    })
    if (plan.length === 0) {
      return
    }

    const occurredAt = task.updated_at
    if (!occurredAt) {
      throw new InvariantViolationException('Persisted task update is missing its update timestamp')
    }
    const updater = await this.taskExternalDependencies.user.findUserIdentity(updaterId, trx)
    const updaterName = updater?.username ?? updater?.email ?? 'Unknown'

    for (const notification of plan) {
      await this.notificationStager.stage(
        {
          eventId: buildNotificationEventId({
            eventName: notification.eventName,
            businessEventId: `${task.id}:${oldAssignedTo ?? 'none'}:${task.assigned_to ?? 'none'}:${occurredAt}`,
            recipientId: notification.recipientId,
          }),
          schemaVersion: 1,
          type: notification.type,
          recipientId: notification.recipientId,
          scope: { kind: 'organization', id: task.organization_id },
          actor: { type: 'user', id: updaterId },
          subject: {
            type: BACKEND_NOTIFICATION_ENTITY_TYPES.TASK,
            id: task.id,
          },
          parameters: {
            taskTitle: task.title,
            updaterName,
            assignmentChange: notification.assignmentChange,
          },
          occurredAt,
          correlationId: `${task.id}:${occurredAt}`,
        },
        { trx }
      )
    }
  }
}
