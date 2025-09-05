import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type UpdateTaskStatusDTO from '../dtos/request/update_task_status_dto.js'

import { AuditAction, EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import loggerService from '#modules/logger/public_contracts/logger_service'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
} from '#modules/notifications/public_contracts/notification_constants'
import { notificationPublicApi, type NotificationCreator } from '#modules/notifications/public_contracts/notification_creator'
import type { TaskCachePort } from '#modules/tasks/actions/ports/task_cache_port'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/task_external_dependencies'
import { buildTaskPermissionContext } from '#modules/tasks/actions/support/task_permission_context_builder'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { canUpdateTaskStatus } from '#modules/tasks/domain/task_permission_policy'
import { toLegacyTaskStatusMirror } from '#modules/tasks/domain/task_status_mirror'
import { validateWorkflowTransition } from '#modules/tasks/domain/task_status_rules'
import * as detailQueries from '#modules/tasks/infra/repositories/read/detail_queries'
import TaskStatusRepository from '#modules/tasks/infra/repositories/task_status_repository'
import TaskWorkflowTransitionRepository from '#modules/tasks/infra/repositories/task_workflow_transition_repository'
import * as taskMutations from '#modules/tasks/infra/repositories/write/task_mutations'
import type { TaskRecord, TaskDetailRecord, TaskStatusRecord } from '#modules/tasks/types/task_records'

type ResolvedTaskStatus = TaskStatusRecord

interface PersistedTaskStatusUpdate {
  task: TaskRecord
  oldStatus: string
  oldTaskStatusId: string
  newStatus: ResolvedTaskStatus
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
    private createNotification: NotificationCreator = notificationPublicApi,
    private cache: TaskCachePort
  ) {}

  /**
   * Execute command để update status
   */
  async execute(dto: UpdateTaskStatusDTO): Promise<TaskDetailRecord> {
    const userId = this.requireUserId()
    const updateResult = await this.persistStatusUpdateInTransaction(dto, userId)
    await this.runPostCommitEffects(updateResult, userId, dto)
    return await detailQueries.findByIdWithDetailRecord(updateResult.task.id)
  }

  /**
   * Send notification
   */
  private async sendStatusChangeNotification(
    task: TaskRecord,
    updaterId: string,
    dto: UpdateTaskStatusDTO
  ): Promise<void> {
    try {
      // Don't notify if updater is creator
      if (task.creator_id && task.creator_id !== updaterId) {
        const updater = await this.taskExternalDependencies.user.findUserIdentity(updaterId)
        const updaterName = updater?.username ?? updater?.email ?? 'Unknown'
        await this.createNotification.handle({
          user_id: task.creator_id,
          title: 'Cập nhật trạng thái nhiệm vụ',
          message: dto.getNotificationMessage(task.title, updaterName),
          type: BACKEND_NOTIFICATION_TYPES.TASK_STATUS_UPDATED,
          related_entity_type: BACKEND_NOTIFICATION_ENTITY_TYPES.TASK,
          related_entity_id: task.id,
        })
      }
    } catch (error) {
      loggerService.error('[UpdateTaskStatusCommand] Failed to send notification', error)
    }
  }

  private requireUserId(): string {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    return userId
  }

  private async loadTaskForStatusUpdate(
    taskId: string,
    trx: TransactionClientContract
  ): Promise<TaskRecord> {
    return taskMutations.findActiveForUpdateAsRecord(taskId, trx)
  }

  private async resolveNewStatus(
    task: TaskRecord,
    dto: UpdateTaskStatusDTO,
    trx: TransactionClientContract
  ): Promise<ResolvedTaskStatus> {
    const newStatus = await TaskStatusRepository.findByIdAndOrgActive(
      dto.task_status_id,
      task.organization_id,
      trx
    )

    if (!newStatus) {
      throw new BusinessLogicException('Trạng thái mới không tồn tại hoặc không thuộc tổ chức này')
    }

    return newStatus
  }

  private async ensureStatusUpdatePermission(
    task: TaskRecord,
    dto: UpdateTaskStatusDTO,
    userId: string,
    trx: TransactionClientContract
  ): Promise<string> {
    const currentStatusId = task.task_status_id
    if (!currentStatusId) {
      throw new BusinessLogicException('Task chưa có task_status_id hợp lệ để chuyển trạng thái')
    }

    const permissionContext = await buildTaskPermissionContext(
      userId,
      task,
      trx,
      this.taskExternalDependencies.permission
    )
    enforcePolicy(canUpdateTaskStatus(permissionContext))

    const transitions = await TaskWorkflowTransitionRepository.findFromStatus(
      task.organization_id,
      currentStatusId,
      trx
    )
    const organizationTransitions =
      transitions.length > 0
        ? transitions
        : await TaskWorkflowTransitionRepository.findByOrganization(task.organization_id, trx)
    const workflowConfigured =
      transitions.length > 0 || organizationTransitions.length > 0
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
    trx: TransactionClientContract
  ): Promise<PersistedTaskStatusUpdate> {
    const oldStatus = task.status

    const updatedTask = await taskMutations.updateTask(
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
      this.execCtx
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
    const trx = await db.transaction()

    try {
      const task = await this.loadTaskForStatusUpdate(dto.task_id, trx)
      const newStatus = await this.resolveNewStatus(task, dto, trx)
      const oldTaskStatusId = await this.ensureStatusUpdatePermission(task, dto, userId, trx)
      const updateResult = await this.persistStatusChange(
        task,
        dto,
        userId,
        oldTaskStatusId,
        newStatus,
        trx
      )
      await trx.commit()
      return updateResult
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  private async runPostCommitEffects(
    updateResult: PersistedTaskStatusUpdate,
    userId: string,
    dto: UpdateTaskStatusDTO
  ): Promise<void> {
    if (updateResult.oldTaskStatusId !== dto.task_status_id) {
      void emitter.emit('task:status:changed', {
        taskId: updateResult.task.id,
        assignedTo: updateResult.task.assigned_to,
        oldStatus: updateResult.oldStatus,
        newStatusId: dto.task_status_id,
        newStatus: updateResult.newStatus.slug,
        newStatusCategory: updateResult.newStatus.category,
        changedBy: userId,
      })
    }

    await this.cache.invalidateAfterTaskUpdated(dto.task_id)

    if (updateResult.oldTaskStatusId !== dto.task_status_id) {
      await this.sendStatusChangeNotification(updateResult.task, userId, dto)
    }
  }

}
