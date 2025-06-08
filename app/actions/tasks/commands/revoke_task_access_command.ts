import type { ExecutionContext } from '#types/execution_context'
import { BaseCommand } from '#actions/shared/base_command'
import TaskAssignmentRepository from '#infra/tasks/repositories/task_assignment_repository'
import ProjectMemberRepository from '#infra/projects/repositories/project_member_repository'
import Project from '#models/project'
import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'
import type CreateNotification from '#actions/common/create_notification'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { AuditAction, EntityType } from '#constants/audit_constants'
import { AssignmentStatus } from '#constants/task_constants'
import CacheService from '#services/cache_service'
import loggerService from '#services/logger_service'
import emitter from '@adonisjs/core/services/emitter'
import type { DatabaseId } from '#types/database'
import NotFoundException from '#exceptions/not_found_exception'
import ForbiddenException from '#exceptions/forbidden_exception'
import { enforcePolicy } from '#actions/shared/enforce_policy'
import { canRevokeAssignment } from '#domain/tasks/task_assignment_rules'

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

  constructor(execCtx: ExecutionContext, createNotification: CreateNotification) {
    super(execCtx)
    this.notificationService = createNotification
  }

  async handle(dto: RevokeTaskAccessDTO): Promise<void> {
    const userId = this.getCurrentUserId()

    await this.executeInTransaction(async (trx: TransactionClientContract) => {
      // 1. Get assignment details → delegate to Model
      const assignmentRecord = await TaskAssignmentRepository.findActiveWithDetails(
        dto.assignment_id,
        trx
      )

      if (!assignmentRecord) {
        throw new NotFoundException('Assignment không tồn tại')
      }

      // 2. Validate assignment status + reason via pure rule
      enforcePolicy(
        canRevokeAssignment({
          assignmentStatus: assignmentRecord.assignment_status,
          reason: dto.reason,
        })
      )

      // 3. Check permission → delegate to Model
      const hasPermission = assignmentRecord.task.project_id
        ? await this.checkRevokePermission(userId, assignmentRecord.task.project_id, trx)
        : false

      if (!hasPermission) {
        throw new ForbiddenException('Bạn không có quyền revoke assignments trong project này')
      }

      // 4. Update assignment status → delegate to Model
      await TaskAssignmentRepository.cancelAssignment(
        dto.assignment_id,
        `REVOKED - Lý do: ${dto.reason} | Revoked by user_id: ${userId} | Revoked at: ${new Date().toISOString()}`,
        trx
      )

      // 5. Log audit
      await this.logAudit(
        AuditAction.REVOKE_ACCESS,
        EntityType.TASK_ASSIGNMENT,
        dto.assignment_id,
        {
          status: AssignmentStatus.ACTIVE,
          assignee_id: assignmentRecord.assignee_id,
          assignment_type: assignmentRecord.assignment_type,
        },
        {
          status: AssignmentStatus.CANCELLED,
          reason: dto.reason,
        }
      )

      // 6. Notifications (after transaction)
      if (assignmentRecord.task.project_id) {
        await this.sendNotifications(
          assignmentRecord.task_id,
          assignmentRecord.assignee_id,
          assignmentRecord.task.project_id,
          assignmentRecord.assignee?.username ?? 'Unknown',
          dto.reason,
          userId
        )
      }
    })

    // Invalidate task-related caches after transaction
    await CacheService.deleteByPattern(`task:${String(dto.assignment_id)}:*`)
    await CacheService.deleteByPattern(`task:user:*`)

    // Emit domain event
    void emitter.emit('task:access:revoked', {
      taskId: dto.assignment_id,
      userId: dto.assignment_id, // assignment_id used as entity reference
      revokedBy: this.getCurrentUserId(),
      reason: dto.reason,
    })
  }

  private async checkRevokePermission(
    userId: DatabaseId,
    projectId: DatabaseId,
    trx: TransactionClientContract
  ): Promise<boolean> {
    // Check if project manager or owner → delegate to Model
    const isProjectManagerOrOwner = await ProjectMemberRepository.isProjectManagerOrOwner(
      userId,
      projectId,
      trx
    )
    if (isProjectManagerOrOwner) return true

    // Check if org admin or owner → delegate to Model
    const project = await Project.find(projectId, { client: trx })
    if (!project) return false

    return OrganizationUserRepository.isAdminOrOwner(userId, project.organization_id, trx)
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

      // Notify project managers → delegate to Model
      const managerIds = await TaskAssignmentRepository.findProjectManagerIds(projectId, revokerId)

      for (const managerId of managerIds) {
        await this.notificationService.handle({
          user_id: managerId,
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
