import type AssignTaskDTO from '../../dtos/request/assign_task_dto.js'

import { stageAssignmentNotifications } from './assign_task_notification_stager.js'
import { ensureAssignmentPreconditions } from './assign_task_precondition_validator.js'

import { AuditAction, EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { PLATFORM_EVENT_NAMES } from '#modules/observability/public_contracts/platform_event_names'
import {
  platformOperationalLogger,
  platformWorkflowLogger,
} from '#modules/observability/public_contracts/platform_observability'
import { BaseCommand } from '#modules/tasks/actions/base_command'
import { settleTaskPostCommitEffects } from '#modules/tasks/actions/commands/internal/settle_task_post_commit_effects'
import { synchronizeTaskAssignment } from '#modules/tasks/actions/commands/internal/synchronize_task_assignment'
import { synchronizeTaskAssignmentContractForTask } from '#modules/tasks/actions/commands/internal/synchronize_task_assignment_contract'
import type { TaskCachePort } from '#modules/tasks/actions/ports/outbound/task_cache_port'
import type { TaskEventPublisher } from '#modules/tasks/actions/ports/outbound/task_event_publisher'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type { TaskNotificationStager } from '#modules/tasks/actions/ports/outbound/task_notification_stager'
import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { buildTaskAssignmentEvent } from '#modules/tasks/observability/task_event_factory'
import type { TaskDetailRecord, TaskRecord } from '#modules/tasks/types/task_records'


interface PersistedTaskAssignment {
  task: TaskRecord
  oldAssignedTo: string | null
}

/**
 * Command để giao task cho người dùng
 *
 * Business Rules:
 * - Assign/Reassign/Unassign
 * - Chỉ thành viên project mới được giao trực tiếp; scope khác đi qua ứng tuyển
 * - Notification gửi cho assignee mới (và có thể old assignee)
 * - Audit log đầy đủ
 *
 * Pattern: FETCH → DECIDE → PERSIST → POST-COMMIT
 */
export default class AssignTaskCommand extends BaseCommand<AssignTaskDTO, TaskDetailRecord> {
  constructor(
    execCtx: TaskActionContext,
    private notificationStager: TaskNotificationStager,
    private taskExternalDependencies: TaskExternalDependencies,
    private cache: TaskCachePort,
    private readonly taskEventPublisher: TaskEventPublisher
  ) {
    super(execCtx, taskExternalDependencies.transactions)
  }

  async handle(dto: AssignTaskDTO): Promise<TaskDetailRecord> {
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

  execute(dto: AssignTaskDTO): Promise<TaskDetailRecord> {
    return this.handle(dto)
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

  private async persistAssignment(
    task: TaskRecord,
    dto: AssignTaskDTO,
    userId: string,
    trx: TaskTransaction
  ): Promise<PersistedTaskAssignment> {
    const oldAssignedTo = task.assigned_to
    const oldValues = { ...task }

    // Sync assignment lifecycle: task_assignments + tasks.assigned_to cache
    const assignment = await synchronizeTaskAssignment(
      {
        taskId: task.id,
        assigneeId: dto.assigned_to,
        assignedBy: userId,
        enforceSkillEligibility: false,
      },
      trx,
      this.taskExternalDependencies.assignments,
      this.taskExternalDependencies.lifecycle,
      this.taskExternalDependencies.skill
    )

    // Fetch updated task for audit
    const updatedTask = await this.taskExternalDependencies.lifecycle.lockActiveTask(
      task.id,
      trx
    )
    if (assignment) {
      await synchronizeTaskAssignmentContractForTask(
        assignment,
        updatedTask,
        trx,
        this.taskExternalDependencies
      )
    }

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
      await stageAssignmentNotifications(
        updatedTask,
        userId,
        dto,
        oldAssignedTo,
        this.taskExternalDependencies,
        this.notificationStager,
        trx
      )
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
      await ensureAssignmentPreconditions(userId, dto, task, this.taskExternalDependencies, trx)
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
}
