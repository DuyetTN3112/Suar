import Task from '#models/task'
import User from '#models/user'
import OrganizationUser from '#models/organization_user'
import AuditLog from '#models/audit_log'
import type DeleteTaskDTO from '../dtos/delete_task_dto.js'
import type CreateNotification from '#actions/common/create_notification'
import type { ExecutionContext } from '#types/execution_context'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import { getErrorMessage } from '#libs/error_utils'
import { AuditAction, EntityType } from '#constants/audit_constants'
import CacheService from '#services/cache_service'
import emitter from '@adonisjs/core/services/emitter'
import loggerService from '#services/logger_service'
import { enforcePolicy } from '#actions/shared/rules/enforce_policy'
import { canDeleteTask, canPermanentDeleteTask } from '#actions/tasks/rules/task_permission_policy'

/**
 * Command để xóa task
 *
 * Business Rules:
 * - Soft delete mặc định (set deleted_at)
 * - Hard delete chỉ dành cho Superadmin (optional feature)
 * - Notify assignee và creator
 * - Audit log đầy đủ
 *
 * Pattern: FETCH → DECIDE → PERSIST
 */
export default class DeleteTaskCommand {
  constructor(
    protected execCtx: ExecutionContext,
    private createNotification: CreateNotification
  ) {}

  /**
   * Execute command để xóa task
   */
  async execute(dto: DeleteTaskDTO): Promise<{ success: boolean; message: string }> {
    const userId = this.execCtx.userId
    if (!userId) {
      return {
        success: false,
        message: 'Bạn cần đăng nhập để thực hiện hành động này',
      }
    }

    const trx = await db.transaction()
    try {
      // ── FETCH ──────────────────────────────────────────────────────────
      const task = await Task.query({ client: trx })
        .where('id', dto.task_id)
        .whereNull('deleted_at')
        .firstOrFail()

      const [systemRole, orgRole, isMember] = await Promise.all([
        User.getSystemRoleName(userId),
        OrganizationUser.getOrgRole(userId, task.organization_id),
        OrganizationUser.isMember(userId, task.organization_id),
      ])

      // ── DECIDE (pure, sync) ────────────────────────────────────────────
      enforcePolicy(
        canDeleteTask({
          actorId: userId,
          actorSystemRole: systemRole,
          actorOrgRole: orgRole,
          actorProjectRole: null,
          taskCreatorId: task.creator_id,
          taskAssignedTo: task.assigned_to,
          taskOrganizationId: task.organization_id,
          taskProjectId: task.project_id,
          isActiveAssignee: false,
          isActorOrgMember: isMember,
        })
      )

      // Hard delete requires superadmin (pure rule)
      if (dto.isPermanentDelete()) {
        enforcePolicy(canPermanentDeleteTask({ actorSystemRole: systemRole }))
      }

      // ── PERSIST ────────────────────────────────────────────────────────
      const taskData = task.toJSON()

      if (dto.isPermanentDelete()) {
        await task.useTransaction(trx).delete()
      } else {
        task.deleted_at = DateTime.now()
        await task.useTransaction(trx).save()
      }

      await AuditLog.create(
        {
          user_id: userId,
          action: dto.isPermanentDelete() ? AuditAction.HARD_DELETE : AuditAction.DELETE,
          entity_type: EntityType.TASK,
          entity_id: dto.task_id,
          old_values: taskData,
          ip_address: this.execCtx.ip,
          user_agent: this.execCtx.userAgent,
        },
        { client: trx }
      )

      await trx.commit()

      // Emit cache invalidation event
      void emitter.emit('cache:invalidate', {
        entityType: 'task',
        entityId: dto.task_id,
      })

      // Invalidate task-related caches
      await CacheService.deleteByPattern(`task:${String(dto.task_id)}:*`)
      await CacheService.deleteByPattern(`organization:tasks:*`)
      await CacheService.deleteByPattern(`tasks:public:*`)
      await CacheService.deleteByPattern(`task:user:*`)

      // Send notifications (after transaction)
      if (taskData.assigned_to && taskData.assigned_to !== userId) {
        await this.createNotification.handle({
          user_id: taskData.assigned_to as string,
          type: 'task_deleted',
          title: 'Nhiệm vụ đã bị xóa',
          message: `Nhiệm vụ "${String(taskData.title)}" đã bị xóa${dto.hasReason() ? ` (${dto.reason ?? ''})` : ''}`,
          related_entity_type: 'task',
          related_entity_id: dto.task_id,
        })
      }

      if (taskData.creator_id !== userId && taskData.creator_id !== taskData.assigned_to) {
        await this.createNotification.handle({
          user_id: taskData.creator_id as string,
          type: 'task_deleted',
          title: 'Nhiệm vụ đã bị xóa',
          message: `Nhiệm vụ "${String(taskData.title)}" đã bị xóa${dto.hasReason() ? ` (${dto.reason ?? ''})` : ''}`,
          related_entity_type: 'task',
          related_entity_id: dto.task_id,
        })
      }

      return {
        success: true,
        message: dto.isPermanentDelete()
          ? 'Nhiệm vụ đã được xóa vĩnh viễn'
          : 'Nhiệm vụ đã được xóa',
      }
    } catch (error: unknown) {
      await trx.rollback()
      loggerService.error('[DeleteTaskCommand] Error:', error)
      return {
        success: false,
        message: getErrorMessage(error, 'Có lỗi xảy ra khi xóa nhiệm vụ'),
      }
    }
  }
}
