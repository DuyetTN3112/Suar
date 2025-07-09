import type Task from '#models/task'
import TaskRepository from '#infra/tasks/repositories/task_repository'
import TaskStatusRepository from '#infra/tasks/repositories/task_status_repository'
import TaskWorkflowTransitionRepository from '#infra/tasks/repositories/task_workflow_transition_repository'
import UserRepository from '#infra/users/repositories/user_repository'
import CreateAuditLog from '#actions/common/create_audit_log'
import type UpdateTaskStatusDTO from '../dtos/request/update_task_status_dto.js'
import type CreateNotification from '#actions/common/create_notification'
import type { ExecutionContext } from '#types/execution_context'
import db from '@adonisjs/lucid/services/db'
import { AuditAction, EntityType } from '#constants/audit_constants'
import CacheService from '#services/cache_service'
import emitter from '@adonisjs/core/services/emitter'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import BusinessLogicException from '#exceptions/business_logic_exception'
import loggerService from '#services/logger_service'
import type { DatabaseId } from '#types/database'
import { enforcePolicy } from '#actions/shared/enforce_policy'
import { canUpdateTaskStatus } from '#domain/tasks/task_permission_policy'
import { validateWorkflowTransition } from '#domain/tasks/task_status_rules'
import { buildTaskPermissionContext } from '#actions/tasks/support/task_permission_context_builder'

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
    private createNotification: CreateNotification
  ) {}

  /**
   * Execute command để update status
   */
  async execute(dto: UpdateTaskStatusDTO): Promise<Task> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    // Start transaction
    const trx = await db.transaction()

    try {
      // ── FETCH ──────────────────────────────────────────────────────────
      const task = await TaskRepository.findActiveForUpdate(dto.task_id, trx)

      // Load new status and verify it belongs to the same organization
      const newStatus = await TaskStatusRepository.findByIdAndOrgActive(
        dto.task_status_id,
        task.organization_id,
        trx
      )

      if (!newStatus) {
        throw new BusinessLogicException(
          'Trạng thái mới không tồn tại hoặc không thuộc tổ chức này'
        )
      }

      const currentStatusId = task.task_status_id
      if (!currentStatusId) {
        throw new BusinessLogicException('Task chưa có task_status_id hợp lệ để chuyển trạng thái')
      }

      // ── DECIDE (pure, sync) ────────────────────────────────────────────
      const permissionContext = await buildTaskPermissionContext(userId, task, trx)
      enforcePolicy(canUpdateTaskStatus(permissionContext))

      const oldStatus = task.status
      const oldTaskStatusId = task.task_status_id

      // Load allowed transitions from DB
      const transitions = await TaskWorkflowTransitionRepository.findFromStatus(
        task.organization_id,
        currentStatusId,
        trx
      )

      const matchingTransition = transitions.find((t) => t.to_status_id === dto.task_status_id)

      enforcePolicy(
        validateWorkflowTransition({
          currentStatusId,
          newStatusId: dto.task_status_id,
          allowedTargetIds: transitions.map((t) => t.to_status_id),
          conditions: matchingTransition?.conditions ?? {},
          isAssigned: task.assigned_to !== null,
        })
      )

      // ── PERSIST ────────────────────────────────────────────────────────
      task.task_status_id = dto.task_status_id
      task.status = newStatus.category // backward compat: use category for legacy status column
      task.updated_by = userId
      await TaskRepository.save(task, trx)

      await new CreateAuditLog(this.execCtx).handle({
        user_id: userId,
        action: AuditAction.UPDATE_STATUS,
        entity_type: EntityType.TASK,
        entity_id: dto.task_id,
        old_values: { status: oldStatus },
        new_values: { status: newStatus.slug, task_status_id: dto.task_status_id },
      })

      await trx.commit()

      // Emit domain event after commit only when status definition changed.
      if (oldTaskStatusId !== dto.task_status_id) {
        void emitter.emit('task:status:changed', {
          task,
          oldStatus,
          newStatusId: dto.task_status_id,
          newStatus: newStatus.slug,
          newStatusCategory: newStatus.category,
          changedBy: userId,
        })
      }

      // Invalidate task-related caches
      await CacheService.deleteByPattern(`task:${dto.task_id}:*`)
      await CacheService.deleteByPattern(`organization:tasks:*`)
      await CacheService.deleteByPattern(`task:user:*`)

      // Send notification (outside transaction)
      if (oldTaskStatusId !== dto.task_status_id) {
        await this.sendStatusChangeNotification(task, userId, dto)
      }

      return await TaskRepository.findByIdWithStatusRelations(task.id)
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  /**
   * Send notification
   */
  private async sendStatusChangeNotification(
    task: Task,
    updaterId: DatabaseId,
    dto: UpdateTaskStatusDTO
  ): Promise<void> {
    try {
      // Don't notify if updater is creator
      if (task.creator_id && task.creator_id !== updaterId) {
        const updater = await UserRepository.findById(updaterId)
        const updaterName = updater?.username ?? updater?.email ?? 'Unknown'
        await this.createNotification.handle({
          user_id: task.creator_id,
          title: 'Cập nhật trạng thái nhiệm vụ',
          message: dto.getNotificationMessage(task.title, updaterName),
          type: 'task_status_updated',
          related_entity_type: 'task',
          related_entity_id: task.id,
        })
      }
    } catch (error) {
      loggerService.error('[UpdateTaskStatusCommand] Failed to send notification', error)
    }
  }
}
