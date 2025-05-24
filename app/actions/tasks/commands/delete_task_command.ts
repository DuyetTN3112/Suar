import Task from '#models/task'
import User from '#models/user'
import AuditLog from '#models/audit_log'
import DeleteTaskDTO from '../dtos/delete_task_dto.js'
import CreateNotification from '#actions/common/create_notification'
import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'

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
    protected ctx: HttpContext,
    private createNotification: CreateNotification
  ) {}

  /**
   * Execute command để xóa task
   */
  async execute(dto: DeleteTaskDTO): Promise<{ success: boolean; message: string }> {
    const user = this.ctx.auth.user!

    const trx = await db.transaction()
    try {
      // Load task
      const task = await Task.query({ client: trx })
        .where('id', dto.task_id)
        .whereNull('deleted_at')
        .firstOrFail()

      // Check permission
      await this.validateDeletePermission(user, task)

      // Save task info for notifications and audit
      const taskData = task.toJSON()

      // Perform delete
      if (dto.isPermanentDelete()) {
        // Hard delete (chỉ Superadmin)
        await this.validateSuperadminPermission(user)
        await task.useTransaction(trx).delete()
      } else {
        // Soft delete
        task.deleted_at = DateTime.now()
        await task.useTransaction(trx).save()
      }

      // Create audit log
      await AuditLog.create(
        {
          user_id: user.id,
          action: dto.isPermanentDelete() ? 'hard_delete' : 'delete',
          entity_type: 'task',
          entity_id: dto.task_id,
          old_values: taskData,
          ip_address: this.ctx.request.ip(),
          user_agent: this.ctx.request.header('user-agent'),
        },
        { client: trx }
      )

      await trx.commit()

      // Send notifications (after transaction)
      if (taskData.assigned_to && taskData.assigned_to !== user.id) {
        await this.createNotification.handle({
          user_id: taskData.assigned_to,
          type: 'task_deleted',
          title: 'Nhiệm vụ đã bị xóa',
          message: `Nhiệm vụ "${taskData.title}" đã bị xóa${dto.hasReason() ? ` (${dto.reason})` : ''}`,
          related_entity_type: 'task',
          related_entity_id: dto.task_id,
        })
      }

      if (taskData.creator_id !== user.id && taskData.creator_id !== taskData.assigned_to) {
        await this.createNotification.handle({
          user_id: taskData.creator_id,
          type: 'task_deleted',
          title: 'Nhiệm vụ đã bị xóa',
          message: `Nhiệm vụ "${taskData.title}" đã bị xóa${dto.hasReason() ? ` (${dto.reason})` : ''}`,
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
    } catch (error: any) {
      await trx.rollback()
      console.error('[DeleteTaskCommand] Error:', error)
      return {
        success: false,
        message: error.message || 'Có lỗi xảy ra khi xóa nhiệm vụ',
      }
    }
  }

  /**
   * Validate permission để xóa task
   */
  private async validateDeletePermission(user: User, task: Task): Promise<void> {
    await user.load('role')

    const isSuperAdmin = ['superadmin', 'admin'].includes(user.role?.name?.toLowerCase() || '')

    if (isSuperAdmin) {
      // Admin/Superadmin must belong to organization
      const orgUser = await db
        .from('organization_users')
        .where('organization_id', task.organization_id)
        .where('user_id', user.id)
        .first()

      if (orgUser) {
        return
      }

      throw new Error('Bạn không thuộc tổ chức của task này')
    }

    // Creator can delete own tasks
    if (Number(task.creator_id) === Number(user.id)) {
      return
    }

    // Check organization role
    const orgUser = await db
      .from('organization_users')
      .where('organization_id', task.organization_id)
      .where('user_id', user.id)
      .first()

    if (!orgUser) {
      throw new Error('Bạn không có quyền xóa task này')
    }

    // Organization Owner/Manager can delete
    const isOrgOwnerOrManager = [1, 2].includes(orgUser.role_id)
    if (isOrgOwnerOrManager) {
      return
    }

    throw new Error('Bạn không có quyền xóa task này')
  }

  /**
   * Validate Superadmin permission cho hard delete
   */
  private async validateSuperadminPermission(user: User): Promise<void> {
    await user.load('role')

    const isSuperAdmin = ['superadmin', 'admin'].includes(user.role?.name?.toLowerCase() || '')

    if (!isSuperAdmin) {
      throw new Error('Chỉ Superadmin mới có quyền xóa vĩnh viễn nhiệm vụ')
    }
  }
}
