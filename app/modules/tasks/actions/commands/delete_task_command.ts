import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

import type DeleteTaskDTO from '../dtos/request/delete_task_dto.js'

import { AuditAction, EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import { getErrorMessage } from '#modules/http/errors/error_utils'
import loggerService from '#modules/logger/public_contracts/logger_service'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
} from '#modules/notifications/public_contracts/notification_constants'
import type { NotificationCreator } from '#modules/notifications/public_contracts/notification_creator'
import type { TaskCachePort } from '#modules/tasks/actions/ports/task_cache_port'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/task_external_dependencies'
import { buildTaskPermissionContext } from '#modules/tasks/actions/support/task_permission_context_builder'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { canDeleteTask, canPermanentDeleteTask } from '#modules/tasks/domain/task_permission_policy'
import * as taskMutations from '#modules/tasks/infra/repositories/write/task_mutations'

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
    protected execCtx: TaskActionContext,
    private taskExternalDependencies: TaskExternalDependencies,
    private createNotification: NotificationCreator,
    private cache: TaskCachePort
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
      const permissionContext = await buildTaskPermissionContext(
        userId,
        task,
        trx,
        this.taskExternalDependencies.permission
      )
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

      await this.cache.invalidateAfterTaskDeleted(dto.task_id)

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
