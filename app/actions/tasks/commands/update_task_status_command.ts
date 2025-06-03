import Task from '#models/task'
import User from '#models/user'
import AuditLog from '#models/audit_log'
import OrganizationUser from '#models/organization_user'
import type UpdateTaskStatusDTO from '../dtos/update_task_status_dto.js'
import type CreateNotification from '#actions/common/create_notification'
import type { ExecutionContext } from '#types/execution_context'
import db from '@adonisjs/lucid/services/db'
import { AuditAction, EntityType } from '#constants/audit_constants'
import CacheService from '#services/cache_service'
import emitter from '@adonisjs/core/services/emitter'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import loggerService from '#services/logger_service'
import type { DatabaseId } from '#types/database'
import { enforcePolicy } from '#actions/shared/rules/enforce_policy'
import { canUpdateTaskStatus } from '#actions/tasks/rules/task_permission_policy'
import { validateTransition } from '#actions/tasks/rules/task_state_machine'

/**
 * Command để cập nhật trạng thái task
 *
 * Business Rules:
 * - Validate status transition (enforced via task state machine)
 * - Set updated_by
 * - Notify creator nếu status thay đổi
 * - Audit log đầy đủ
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

      const [systemRole, orgRole] = await Promise.all([
        User.getSystemRoleName(userId),
        OrganizationUser.getOrgRole(userId, task.organization_id),
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

      enforcePolicy(
        validateTransition({
          currentStatus: oldStatus,
          newStatus: dto.status,
          isAssigned: task.assigned_to !== null,
        })
      )

      // ── PERSIST ────────────────────────────────────────────────────────
      task.merge(dto.toObject())
      task.updated_by = String(userId)
      await task.save()

      await AuditLog.create(
        {
          user_id: userId,
          action: AuditAction.UPDATE_STATUS,
          entity_type: EntityType.TASK,
          entity_id: dto.task_id,
          old_values: { status: oldStatus },
          new_values: { status: task.status },
          ip_address: this.execCtx.ip,
          user_agent: this.execCtx.userAgent,
        },
        { client: trx }
      )

      await trx.commit()

      // Emit domain event
      if (oldStatus !== task.status) {
        void emitter.emit('task:status:changed', {
          task,
          oldStatus,
          newStatus: task.status,
          changedBy: userId,
        })
      }

      // Invalidate task-related caches
      await CacheService.deleteByPattern(`task:${String(dto.task_id)}:*`)
      await CacheService.deleteByPattern(`organization:tasks:*`)
      await CacheService.deleteByPattern(`task:user:*`)

      // Send notification (outside transaction)
      if (oldStatus !== task.status) {
        await this.sendStatusChangeNotification(task, userId, dto)
      }

      // Load relations (v3: status/label/priority are inline columns)
      await task.load((loader) => {
        loader.load('assignee').load('creator').load('updater')
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
