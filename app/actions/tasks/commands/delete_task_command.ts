import Task from '#models/task'
import AuditLog from '#models/audit_log'
import type DeleteTaskDTO from '../dtos/delete_task_dto.js'
import type CreateNotification from '#actions/common/create_notification'
import type { ExecutionContext } from '#types/execution_context'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import { getErrorMessage } from '#libs/error_utils'
import { AuditAction, EntityType } from '#constants/audit_constants'
import CacheService from '#services/cache_service'
import ForbiddenException from '#exceptions/forbidden_exception'
import emitter from '@adonisjs/core/services/emitter'
import loggerService from '#services/logger_service'
import type { DatabaseId } from '#types/database'

/**
 * Command để xóa task
 *
 * Business Rules:
 * - Soft delete mặc định (set deleted_at)
 * - Hard delete chỉ dành cho Superadmin (optional feature)
 * - Notify assignee và creator
 * - Audit log đầy đủ
 *
 * Permissions:
 * - Superadmin/Admin: Nếu thuộc organization
 * - Creator: Có thể xóa task của mình
 * - Organization Owner/Manager: Có thể xóa tasks trong org
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
      // Load task
      const task = await Task.query({ client: trx })
        .where('id', dto.task_id)
        .whereNull('deleted_at')
        .firstOrFail()

      // Check permission
      await this.validateDeletePermission(userId, task)

      // Save task info for notifications and audit
      const taskData = task.toJSON()

      // Perform delete
      if (dto.isPermanentDelete()) {
        // Hard delete (chỉ Superadmin)
        await this.validateSuperadminPermission(userId)
        await task.useTransaction(trx).delete()
      } else {
        // Soft delete
        task.deleted_at = DateTime.now()
        await task.useTransaction(trx).save()
      }

      // Create audit log
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
          user_id: taskData.assigned_to as number,
          type: 'task_deleted',
          title: 'Nhiệm vụ đã bị xóa',
          message: `Nhiệm vụ "${String(taskData.title)}" đã bị xóa${dto.hasReason() ? ` (${dto.reason ?? ''})` : ''}`,
          related_entity_type: 'task',
          related_entity_id: dto.task_id,
        })
      }

      if (taskData.creator_id !== userId && taskData.creator_id !== taskData.assigned_to) {
        await this.createNotification.handle({
          user_id: taskData.creator_id as number,
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

  /**
   * Validate permission để xóa task
   */
  private async validateDeletePermission(userId: DatabaseId, task: Task): Promise<void> {
    // Check if user is superadmin via system_roles
    const userData = (await db
      .from('users')
      .join('system_roles', 'users.system_role_id', 'system_roles.id')
      .where('users.id', userId)
      .select('system_roles.name as role_name')
      .first()) as { role_name?: string } | null

    const isSuperAdmin = ['superadmin', 'admin'].includes(userData?.role_name?.toLowerCase() || '')

    if (isSuperAdmin) {
      // Admin/Superadmin must belong to organization
      const orgUser = (await db
        .from('organization_users')
        .where('organization_id', task.organization_id)
        .where('user_id', userId)
        .first()) as { id: DatabaseId } | null

      if (orgUser) {
        return
      }

      throw new ForbiddenException('Bạn không thuộc tổ chức của task này')
    }

    // Creator can delete own tasks
    if (task.creator_id === userId) {
      return
    }

    // Check organization role
    const orgUser = (await db
      .from('organization_users')
      .where('organization_id', task.organization_id)
      .where('user_id', userId)
      .first()) as { role_id: number } | null

    if (!orgUser) {
      throw new ForbiddenException('Bạn không có quyền xóa task này')
    }

    // Organization Owner/Manager can delete
    const isOrgOwnerOrManager = [1, 2].includes(orgUser.role_id)
    if (isOrgOwnerOrManager) {
      return
    }

    throw new ForbiddenException('Bạn không có quyền xóa task này')
  }

  /**
   * Validate Superadmin permission cho hard delete
   */
  private async validateSuperadminPermission(userId: DatabaseId): Promise<void> {
    const userData = (await db
      .from('users')
      .join('system_roles', 'users.system_role_id', 'system_roles.id')
      .where('users.id', userId)
      .select('system_roles.name as role_name')
      .first()) as { role_name?: string } | null

    const isSuperAdmin = ['superadmin', 'admin'].includes(userData?.role_name?.toLowerCase() || '')

    if (!isSuperAdmin) {
      throw new ForbiddenException('Chỉ Superadmin mới có quyền xóa vĩnh viễn nhiệm vụ')
    }
  }
}
