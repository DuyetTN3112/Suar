import type { HttpContext } from '@adonisjs/core/http'
import { BaseCommand } from '#actions/shared/base_command'
import db from '@adonisjs/lucid/services/db'
import type CreateNotification from '#actions/common/create_notification'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { AuditAction, EntityType } from '#constants/audit_constants'
import CacheService from '#services/cache_service'
import loggerService from '#services/logger_service'
import type { DatabaseId } from '#types/database'
import BusinessLogicException from '#exceptions/business_logic_exception'
import NotFoundException from '#exceptions/not_found_exception'
import ForbiddenException from '#exceptions/forbidden_exception'

/**
 * DTO for revoking task access
 */
export interface RevokeTaskAccessDTO {
  assignment_id: DatabaseId
  reason: string
}

/**
 * Command: Revoke Task Access
 *
 * Migrate từ stored procedure: revoke_task_access
 *
 * Business rules:
 * - Chỉ project manager/owner hoặc org admin/owner có thể revoke
 * - Chỉ revoke được assignments đang active
 * - Phải cung cấp lý do
 * - Notify cho assignee và project managers
 */
export default class RevokeTaskAccessCommand extends BaseCommand<RevokeTaskAccessDTO> {
  private notificationService: CreateNotification

  constructor(ctx: HttpContext, createNotification: CreateNotification) {
    super(ctx)
    this.notificationService = createNotification
  }

  async handle(dto: RevokeTaskAccessDTO): Promise<void> {
    const user = this.getCurrentUser()

    // Validate reason
    if (!dto.reason || dto.reason.trim() === '') {
      throw new BusinessLogicException('Phải cung cấp lý do khi revoke task access')
    }

    await this.executeInTransaction(async (trx: TransactionClientContract) => {
      // 1. Get assignment details
      const assignment = (await trx
        .from('task_assignments')
        .join('tasks', 'task_assignments.task_id', 'tasks.id')
        .join('users', 'task_assignments.assignee_id', 'users.id')
        .where('task_assignments.id', dto.assignment_id)
        .select(
          'task_assignments.task_id',
          'task_assignments.assignee_id',
          'task_assignments.assignment_type',
          'task_assignments.assignment_status',
          'tasks.project_id',
          'users.username as assignee_name'
        )
        .forUpdate()
        .first()) as {
        task_id: DatabaseId
        assignee_id: DatabaseId
        assignment_type: string
        assignment_status: string
        project_id: DatabaseId
        assignee_name: string
      } | null

      if (!assignment) {
        throw new NotFoundException('Assignment không tồn tại')
      }

      // 2. Check status is active
      if (assignment.assignment_status !== 'active') {
        throw new BusinessLogicException('Chỉ có thể revoke assignments đang active')
      }

      // 3. Check permission
      const hasPermission = await this.checkRevokePermission(user.id, assignment.project_id, trx)

      if (!hasPermission) {
        throw new ForbiddenException('Bạn không có quyền revoke assignments trong project này')
      }

      // 4. Update assignment status
      await trx
        .from('task_assignments')
        .where('id', dto.assignment_id)
        .update({
          assignment_status: 'cancelled',
          completion_notes: `REVOKED - Lý do: ${dto.reason} | Revoked by user_id: ${user.id} | Revoked at: ${new Date().toISOString()}`,
        })

      // 5. Log audit
      await this.logAudit(
        AuditAction.REVOKE_ACCESS,
        EntityType.TASK_ASSIGNMENT,
        dto.assignment_id,
        {
          status: 'active',
          assignee_id: assignment.assignee_id,
          assignment_type: assignment.assignment_type,
        },
        {
          status: 'cancelled',
          reason: dto.reason,
        }
      )

      // 6. Notifications (after transaction)
      await this.sendNotifications(
        assignment.task_id,
        assignment.assignee_id,
        assignment.project_id,
        assignment.assignee_name,
        dto.reason,
        user.id
      )
    })

    // Invalidate task-related caches after transaction
    await CacheService.deleteByPattern(`task:${String(dto.assignment_id)}:*`)
    await CacheService.deleteByPattern(`task:user:*`)
  }

  private async checkRevokePermission(
    userId: DatabaseId,
    projectId: DatabaseId,
    trx: TransactionClientContract
  ): Promise<boolean> {
    // Check if project manager or owner
    const projectMember = (await trx
      .from('project_members')
      .join('project_roles', 'project_members.project_role_id', 'project_roles.id')
      .where('project_members.user_id', userId)
      .where('project_members.project_id', projectId)
      .whereIn('project_roles.name', ['project_owner', 'project_manager'])
      .first()) as { id: DatabaseId } | null

    if (projectMember) return true

    // Check if org admin or owner
    const project = (await trx
      .from('projects')
      .where('id', projectId)
      .select('organization_id')
      .first()) as { organization_id: DatabaseId } | null

    if (!project) return false

    const orgMember = (await trx
      .from('organization_users')
      .where('user_id', userId)
      .where('organization_id', project.organization_id)
      .whereIn('role_id', [1, 2]) // owner or admin
      .first()) as { id: DatabaseId } | null

    return !!orgMember
  }

  private async sendNotifications(
    taskId: DatabaseId,
    assigneeId: DatabaseId,
    projectId: DatabaseId,
    assigneeName: string,
    reason: string,
    revokerId: DatabaseId
  ): Promise<void> {
    try {
      // Notify assignee
      await this.notificationService.handle({
        user_id: assigneeId,
        title: 'Quyền truy cập task đã bị thu hồi',
        message: `Quyền truy cập của bạn vào task đã bị thu hồi. Lý do: ${reason}`,
        type: 'task_access_revoked',
        related_entity_type: 'task',
        related_entity_id: taskId,
      })

      // Notify project managers
      const managers = (await db
        .from('project_members')
        .join('project_roles', 'project_members.project_role_id', 'project_roles.id')
        .where('project_members.project_id', projectId)
        .whereNot('project_members.user_id', revokerId)
        .whereIn('project_roles.name', ['project_owner', 'project_manager'])
        .select('project_members.user_id')) as Array<{ user_id: DatabaseId }>

      for (const manager of managers) {
        await this.notificationService.handle({
          user_id: manager.user_id,
          title: 'Task assignment đã bị revoke',
          message: `Assignment của ${assigneeName} đã bị revoke. Task cần được reassign.`,
          type: 'assignment_revoked_need_action',
          related_entity_type: 'task',
          related_entity_id: taskId,
        })
      }
    } catch (error) {
      loggerService.error('[RevokeTaskAccessCommand] Failed to send notifications:', error)
    }
  }
}
