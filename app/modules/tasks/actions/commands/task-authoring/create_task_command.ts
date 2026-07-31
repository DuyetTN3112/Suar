import type CreateTaskDTO from '../../dtos/request/task-authoring/create_task_dto.js'

import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
} from '#modules/notifications/public_contracts/notification_constants'
import { buildNotificationEventId } from '#modules/notifications/public_contracts/notification_event_identity'
import { BaseCommand } from '#modules/tasks/actions/base_command'
import { runTaskCreatedPostCommitEffects } from '#modules/tasks/actions/commands/task-authoring/internal/create_task_post_commit'
import { persistTaskCreateWithinTransaction } from '#modules/tasks/actions/commands/task-authoring/internal/create_task_transaction'
import type { TaskCachePort } from '#modules/tasks/actions/ports/outbound/task_cache_port'
import type { TaskEventPublisher } from '#modules/tasks/actions/ports/outbound/task_event_publisher'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type { TaskNotificationStager } from '#modules/tasks/actions/ports/outbound/task_notification_stager'
import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { TaskAuthoringIdempotentReplay } from '#modules/tasks/domain/task-authoring/task_authoring_idempotency'
import type { TaskDetailRecord, TaskRecord } from '#modules/tasks/types/task_records'

const TASK_SEARCH_INVALIDATION_FIELDS = [
  'acceptance_criteria', 'application_deadline', 'assigned_to', 'business_domains',
  'collaboration_type', 'context_background', 'creator_id', 'deleted_at', 'description',
  'difficulty', 'domain_tags', 'due_date', 'environment', 'estimated_users_affected',
  'external_applications_count', 'impact_scope', 'is_public', 'label', 'learning_objectives',
  'member_visible', 'priority', 'problem_categories', 'project_id', 'required_skill_ids',
  'required_skill_category_codes', 'required_skills_text', 'role_in_task', 'status', 'task_types',
  'task_visibility', 'tech_stack', 'title', 'updated_at', 'verification_method',
] as const

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
    let newTask: TaskRecord
    try {
      newTask = await this.executeInTransaction(async (trx) => {
        const task = await this.dependencies.persistTaskCreateWithinTransaction({
          execCtx: this.execCtx,
          dto,
          userId,
          trx,
          externalDependencies: this.taskExternalDependencies,
        })
        const sourceRevision = task.updated_at ?? task.created_at
        if (this.taskExternalDependencies.searchProjectionInvalidation && sourceRevision) {
          await this.taskExternalDependencies.searchProjectionInvalidation.stage({
            taskId: task.id,
            operation: 'upsert',
            sourceRevision,
            changedFields: TASK_SEARCH_INVALIDATION_FIELDS,
          }, trx)
        }
        await this.stageTaskAssignmentNotification(task, dto, userId, trx)
        return task
      })
    } catch (error) {
      if (error instanceof TaskAuthoringIdempotentReplay) {
        const detail = await this.taskExternalDependencies.lifecycle.findTaskDetail(error.taskId)
        return { ...detail, authoring: error.summary }
      }
      throw error
    }
    await this.dependencies.runTaskCreatedPostCommitEffects(
      newTask,
      dto,
      userId,
      this.cache,
      this.taskEventPublisher
    )
    const detail = await this.taskExternalDependencies.lifecycle.findTaskDetail(newTask.id)
    return newTask.authoring ? { ...detail, authoring: newTask.authoring } : detail
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
