import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

import type DeleteTaskDTO from '../dtos/request/delete_task_dto.js'

import { getErrorMessage } from '#libs/error_utils'
import { auditPublicApi } from '#modules/audit/actions/public_api'
import { AuditAction, EntityType } from '#modules/audit/constants/audit_constants'
import { enforcePolicy } from '#modules/authorization/actions/public_api'
import CacheService from '#modules/cache/infra/cache_service'
import loggerService from '#modules/logger/infra/logger_service'
import { notificationPublicApi, type NotificationCreator } from '#modules/notifications/actions/public_api'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
} from '#modules/notifications/constants/notification_constants'
import { buildTaskPermissionContext } from '#modules/tasks/actions/support/task_permission_context_builder'
import { canDeleteTask, canPermanentDeleteTask } from '#modules/tasks/domain/task_permission_policy'
import * as taskMutations from '#modules/tasks/infra/repositories/write/task_mutations'
import type { ExecutionContext } from '#types/execution_context'

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
    private createNotification: NotificationCreator = notificationPublicApi
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
      const task = await taskMutations.findActiveForUpdateAsRecord(dto.task_id, trx)

      // ── DECIDE (pure, sync) ────────────────────────────────────────────
      const permissionContext = await buildTaskPermissionContext(userId, task, trx)
      enforcePolicy(
        canDeleteTask({
          ...permissionContext,
          isActorOrgMember: permissionContext.actorOrgRole !== null,
        })
      )

      // Hard delete requires superadmin (pure rule)
      if (dto.isPermanentDelete()) {
        enforcePolicy(
          canPermanentDeleteTask({ actorSystemRole: permissionContext.actorSystemRole })
        )
      }

      // ── PERSIST ────────────────────────────────────────────────────────
      const taskData = { ...task }

      if (dto.isPermanentDelete()) {
        await taskMutations.hardDeleteById(dto.task_id, trx)
      } else {
        await taskMutations.updateTask(
          dto.task_id,
          { deleted_at: DateTime.now().toISO() },
          trx
        )
      }

      await auditPublicApi.log(
        {
          user_id: userId,
          action: dto.isPermanentDelete() ? AuditAction.HARD_DELETE : AuditAction.DELETE,
          entity_type: EntityType.TASK,
          entity_id: dto.task_id,
          old_values: taskData,
        },
        this.execCtx
      )

      await trx.commit()

      // Emit cache invalidation event
      void emitter.emit('cache:invalidate', {
        entityType: 'task',
        entityId: dto.task_id,
      })

      // Invalidate task-related caches
      await CacheService.deleteByPattern(`task:${dto.task_id}:*`)
      await CacheService.deleteByPattern(`organization:tasks:*`)
      await CacheService.deleteByPattern(`tasks:public:*`)
      await CacheService.deleteByPattern(`task:user:*`)

      // Send notifications (after transaction)
      if (taskData.assigned_to && taskData.assigned_to !== userId) {
        await this.createNotification.handle({
          user_id: taskData.assigned_to,
          type: BACKEND_NOTIFICATION_TYPES.TASK_DELETED,
          title: 'Nhiệm vụ đã bị xóa',
          message: `Nhiệm vụ "${taskData.title}" đã bị xóa${dto.hasReason() ? ` (${dto.reason ?? ''})` : ''}`,
          related_entity_type: BACKEND_NOTIFICATION_ENTITY_TYPES.TASK,
          related_entity_id: dto.task_id,
        })
      }

      if (taskData.creator_id !== userId && taskData.creator_id !== taskData.assigned_to) {
        await this.createNotification.handle({
          user_id: taskData.creator_id,
          type: BACKEND_NOTIFICATION_TYPES.TASK_DELETED,
          title: 'Nhiệm vụ đã bị xóa',
          message: `Nhiệm vụ "${taskData.title}" đã bị xóa${dto.hasReason() ? ` (${dto.reason ?? ''})` : ''}`,
          related_entity_type: BACKEND_NOTIFICATION_ENTITY_TYPES.TASK,
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
