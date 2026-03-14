import Task from '#models/task'
import User from '#models/user'
import TaskStatusRepository from '#repositories/task_status_repository'
import TaskWorkflowTransitionRepository from '#repositories/task_workflow_transition_repository'
import UserRepository from '#repositories/user_repository'
import AuditLog from '#models/mongo/audit_log'
import OrganizationUserRepository from '#repositories/organization_user_repository'
import type UpdateTaskStatusDTO from '../dtos/update_task_status_dto.js'
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
import { enforcePolicy } from '#domain/shared/enforce_policy'
import { canUpdateTaskStatus } from '#domain/tasks/task_permission_policy'
import { validateWorkflowTransition } from '#domain/tasks/task_status_rules'

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
      const task = await Task.query({ client: trx })
        .where('id', dto.task_id)
        .whereNull('deleted_at')
        .forUpdate()
        .firstOrFail()

      // Load new status and verify it belongs to the same organization
      const newStatus = await TaskStatusRepository.findByIdAndOrgActive(
        dto.task_status_id,
        task.organization_id,
        trx
      )

      if (!newStatus) {
        throw new BusinessLogicException('Trạng thái mới không tồn tại hoặc không thuộc tổ chức này')
      }

      // Resolve current task_status_id (backward compat: old tasks may only have status slug)
      let currentStatusId = task.task_status_id
      if (!currentStatusId) {
        const currentStatus = await TaskStatusRepository.findBySlug(
          task.organization_id,
          task.status,
          trx
        )
        if (!currentStatus) {
          throw new BusinessLogicException(
            `Không thể xác định trạng thái hiện tại của task (status: ${task.status})`
          )
        }
        currentStatusId = currentStatus.id
      }

      const [systemRole, orgRole] = await Promise.all([
        UserRepository.getSystemRoleName(userId),
        OrganizationUserRepository.getMemberRoleName(task.organization_id, userId, undefined, false),
      ])

      // ── DECIDE (pure, sync) ────────────────────────────────────────────
      enforcePolicy(
        canUpdateTaskStatus({
          actorId: userId,
          actorSystemRole: systemRole,
          actorOrgRole: orgRole,
          actorProjectRole: null,
          taskCreatorId: task.creator_id,
          taskAssignedTo: task.assigned_to,
          taskOrganizationId: task.organization_id,
          taskProjectId: task.project_id,
          isActiveAssignee: false,
        })
      )

      const oldStatus = task.status

      // Load allowed transitions from DB
      const transitions = await TaskWorkflowTransitionRepository.findFromStatus(
        task.organization_id,
        currentStatusId,
        trx
      )

      const matchingTransition = transitions.find(
        (t) => t.to_status_id === dto.task_status_id
      )

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
      task.status = newStatus.slug // backward compat
      task.updated_by = String(userId)
      await task.save()

      await AuditLog.create({
        user_id: userId,
        action: AuditAction.UPDATE_STATUS,
        entity_type: EntityType.TASK,
        entity_id: dto.task_id,
        old_values: { status: oldStatus },
        new_values: { status: newStatus.slug, task_status_id: dto.task_status_id },
        ip_address: this.execCtx.ip,
        user_agent: this.execCtx.userAgent,
      })

      await trx.commit()

      // Emit domain event
      if (oldStatus !== newStatus.slug) {
        void emitter.emit('task:status:changed', {
          task,
          oldStatus,
          newStatus: newStatus.slug,
          newStatusCategory: newStatus.category,
          changedBy: userId,
        })
      }

      // Invalidate task-related caches
      await CacheService.deleteByPattern(`task:${String(dto.task_id)}:*`)
      await CacheService.deleteByPattern(`organization:tasks:*`)
      await CacheService.deleteByPattern(`task:user:*`)

      // Send notification (outside transaction)
      if (oldStatus !== newStatus.slug) {
        await this.sendStatusChangeNotification(task, userId, dto)
      }

      // Load relations
      await task.load((loader) => {
        loader.load('assignee').load('creator').load('updater').load('taskStatus')
      })

      return task
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
        const updater = await User.find(updaterId)
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
