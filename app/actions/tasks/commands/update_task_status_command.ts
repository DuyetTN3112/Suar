import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type UpdateTaskStatusDTO from '../dtos/request/update_task_status_dto.js'
import { DefaultTaskDependencies } from '../ports/task_external_dependencies_impl.js'

import { auditPublicApi } from '#actions/audit/public_api'
import { enforcePolicy } from '#actions/authorization/public_api'
import { notificationPublicApi, type NotificationCreator } from '#actions/notifications/public_api'
import { buildTaskPermissionContext } from '#actions/tasks/support/task_permission_context_builder'
import BusinessLogicException from '#exceptions/business_logic_exception'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import CacheService from '#infra/cache/cache_service'
import loggerService from '#infra/logger/logger_service'
import TaskRepository from '#infra/tasks/repositories/task_repository'
import TaskStatusRepository from '#infra/tasks/repositories/task_status_repository'
import TaskWorkflowTransitionRepository from '#infra/tasks/repositories/task_workflow_transition_repository'
import { AuditAction, EntityType } from '#modules/audit/constants/audit_constants'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
} from '#modules/notifications/constants/notification_constants'
import { canUpdateTaskStatus } from '#modules/tasks/domain/task_permission_policy'
import { validateWorkflowTransition } from '#modules/tasks/domain/task_status_rules'
import type { DatabaseId } from '#types/database'
import type { ExecutionContext } from '#types/execution_context'
import type { TaskRecord, TaskDetailRecord, TaskStatusRecord } from '#types/task_records'

type ResolvedTaskStatus = TaskStatusRecord

interface PersistedTaskStatusUpdate {
  task: TaskRecord
  oldStatus: string
  oldTaskStatusId: DatabaseId
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
    protected execCtx: ExecutionContext,
    private createNotification: NotificationCreator = notificationPublicApi
  ) {}

  /**
   * Execute command để update status
   */
  async execute(dto: UpdateTaskStatusDTO): Promise<TaskDetailRecord> {
    const userId = this.requireUserId()
    const updateResult = await this.persistStatusUpdateInTransaction(dto, userId)
    await this.runPostCommitEffects(updateResult, userId, dto)
    return await TaskRepository.findByIdWithDetailRecord(updateResult.task.id)
  }

  /**
   * Send notification
   */
  private async sendStatusChangeNotification(
    task: TaskRecord,
    updaterId: DatabaseId,
    dto: UpdateTaskStatusDTO
  ): Promise<void> {
    try {
      // Don't notify if updater is creator
      if (task.creator_id && task.creator_id !== updaterId) {
        const updater = await DefaultTaskDependencies.user.findUserIdentity(updaterId)
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

  private requireUserId(): DatabaseId {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    return userId
  }

  private async loadTaskForStatusUpdate(
    taskId: DatabaseId,
    trx: TransactionClientContract
  ): Promise<TaskRecord> {
    return TaskRepository.findActiveForUpdateAsRecord(taskId, trx)
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
    userId: DatabaseId,
    trx: TransactionClientContract
  ): Promise<DatabaseId> {
    const currentStatusId = task.task_status_id
    if (!currentStatusId) {
      throw new BusinessLogicException('Task chưa có task_status_id hợp lệ để chuyển trạng thái')
    }

    const permissionContext = await buildTaskPermissionContext(userId, task, trx)
    enforcePolicy(canUpdateTaskStatus(permissionContext))

    const transitions = await TaskWorkflowTransitionRepository.findFromStatus(
      task.organization_id,
      currentStatusId,
      trx
    )
    const matchingTransition = transitions.find(
      (transition) => transition.to_status_id === dto.task_status_id
    )

    enforcePolicy(
      validateWorkflowTransition({
        currentStatusId,
        newStatusId: dto.task_status_id,
        allowedTargetIds: transitions.map((transition) => transition.to_status_id),
        conditions: matchingTransition?.conditions ?? {},
        isAssigned: task.assigned_to !== null,
      })
    )

    return currentStatusId
  }

  private async persistStatusChange(
    task: TaskRecord,
    dto: UpdateTaskStatusDTO,
    userId: DatabaseId,
    oldTaskStatusId: DatabaseId,
    newStatus: ResolvedTaskStatus,
    trx: TransactionClientContract
  ): Promise<PersistedTaskStatusUpdate> {
    const oldStatus = task.status

    const updatedTask = await TaskRepository.updateTask(
      task.id,
      {
        task_status_id: dto.task_status_id,
        status: newStatus.category,
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
        new_values: { status: newStatus.slug, task_status_id: dto.task_status_id },
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
    userId: DatabaseId
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
    userId: DatabaseId,
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

    await CacheService.deleteByPattern(`task:${dto.task_id}:*`)
    await CacheService.deleteByPattern('organization:tasks:*')
    await CacheService.deleteByPattern('task:user:*')

    if (updateResult.oldTaskStatusId !== dto.task_status_id) {
      await this.sendStatusChangeNotification(updateResult.task, userId, dto)
    }
  }
}
