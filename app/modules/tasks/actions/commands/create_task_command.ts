import type CreateTaskDTO from '../dtos/request/create_task_dto.js'

import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
} from '#modules/notifications/public_contracts/notification_constants'
import { buildNotificationEventId } from '#modules/notifications/public_contracts/notification_event_identity'
import { BaseCommand } from '#modules/tasks/actions/base_command'
import { runTaskCreatedPostCommitEffects } from '#modules/tasks/actions/commands/internal/create_task_post_commit'
import { persistTaskCreateWithinTransaction } from '#modules/tasks/actions/commands/internal/create_task_transaction'
import type { TaskCachePort } from '#modules/tasks/actions/ports/outbound/task_cache_port'
import type { TaskEventPublisher } from '#modules/tasks/actions/ports/outbound/task_event_publisher'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type { TaskNotificationStager } from '#modules/tasks/actions/ports/outbound/task_notification_stager'
import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import type { TaskDetailRecord, TaskRecord } from '#modules/tasks/types/task_records'

interface CreateTaskCommandDependencies {
  persistTaskCreateWithinTransaction: typeof persistTaskCreateWithinTransaction
  runTaskCreatedPostCommitEffects: typeof runTaskCreatedPostCommitEffects
}

const defaultDependencies: CreateTaskCommandDependencies = {
  persistTaskCreateWithinTransaction,
  runTaskCreatedPostCommitEffects,
}

/**
 * Command để tạo task mới
 *
 * Business Rules:
 * - organization_id là bắt buộc (từ session)
 * - creator_id tự động set từ auth.user
 * - Notification gửi cho assignee nếu task được giao
 * - Audit log đầy đủ
 * - Transaction để ensure data consistency
 *
 * Permissions:
 * - User phải đăng nhập
 * - User phải thuộc organization
 * - Có thể thêm permission check (admin/member) nếu cần
 */
export default class CreateTaskCommand extends BaseCommand<CreateTaskDTO, TaskDetailRecord> {
  constructor(
    execCtx: TaskActionContext,
    private taskExternalDependencies: TaskExternalDependencies,
    private notificationStager: TaskNotificationStager,
    private cache: TaskCachePort,
    private readonly taskEventPublisher: TaskEventPublisher,
    private dependencies: CreateTaskCommandDependencies = defaultDependencies
  ) {
    super(execCtx, taskExternalDependencies.transactions)
  }

  /**
   * Execute command để tạo task
   *
   * Di chuyển logic từ database procedure create_task:
   * 1. Check creator active
   * 2. Check org exists
   * 3. Check permission (admin/owner OR project_manager)
   * 4. Validate project thuộc org
   * 5. Validate status/label/priority exists
   * 6. Validate due_date not past
   */
  async handle(dto: CreateTaskDTO): Promise<TaskDetailRecord> {
    const userId = this.getCurrentUserId()
    const newTask = await this.executeInTransaction(async (trx) => {
      const task = await this.dependencies.persistTaskCreateWithinTransaction({
        execCtx: this.execCtx,
        dto,
        userId,
        trx,
        externalDependencies: this.taskExternalDependencies,
      })
      await this.stageTaskAssignmentNotification(task, dto, userId, trx)
      return task
    })
    await this.dependencies.runTaskCreatedPostCommitEffects(
      newTask,
      dto,
      userId,
      this.cache,
      this.taskEventPublisher
    )
    return this.taskExternalDependencies.lifecycle.findTaskDetail(newTask.id)
  }

  async execute(dto: CreateTaskDTO): Promise<TaskDetailRecord> {
    return await this.handle(dto)
  }

  private async stageTaskAssignmentNotification(
    task: TaskRecord,
    dto: CreateTaskDTO,
    creatorId: string,
    trx: TaskTransaction
  ): Promise<void> {
    if (!dto.isAssigned() || dto.assigned_to === undefined || dto.assigned_to === creatorId) {
      return
    }

    const occurredAt = task.created_at
    if (!occurredAt) {
      throw new InvariantViolationException('Persisted task is missing its creation timestamp')
    }
    const creator = await this.taskExternalDependencies.user.findUserIdentity(creatorId, trx)
    const creatorName = creator?.username ?? creator?.email ?? 'Unknown'
    await this.notificationStager.stage(
      {
        eventId: buildNotificationEventId({
          eventName: 'task.created_assigned',
          businessEventId: task.id,
          recipientId: dto.assigned_to,
        }),
        schemaVersion: 1,
        type: BACKEND_NOTIFICATION_TYPES.TASK_ASSIGNED,
        recipientId: dto.assigned_to,
        scope: { kind: 'organization', id: task.organization_id },
        actor: { type: 'user', id: creatorId },
        subject: {
          type: BACKEND_NOTIFICATION_ENTITY_TYPES.TASK,
          id: task.id,
        },
        parameters: {
          taskTitle: task.title,
          assignerName: creatorName,
          assignmentChange: 'assigned',
        },
        occurredAt,
        correlationId: task.id,
      },
      { trx }
    )
  }
}
