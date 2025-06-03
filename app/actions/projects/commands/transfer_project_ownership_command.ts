import type { ExecutionContext } from '#types/execution_context'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import Project from '#models/project'
import type { DatabaseId } from '#types/database'
import AuditLog from '#models/audit_log'
import OrganizationUser from '#models/organization_user'
import ProjectMember from '#models/project_member'
import type CreateNotification from '#actions/common/create_notification'
import { ProjectRole } from '#constants/project_constants'
import { EntityType } from '#constants/audit_constants'
import CacheService from '#services/cache_service'
import emitter from '@adonisjs/core/services/emitter'
import loggerService from '#services/logger_service'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import { enforcePolicy } from '#actions/shared/rules/enforce_policy'
import { canTransferProjectOwnership } from '../rules/project_permission_policy.js'

/**
 * DTO for transferring project ownership
 */
export interface TransferProjectOwnershipDTO {
  project_id: DatabaseId
  new_owner_id: DatabaseId
}

/**
 * Command: Transfer Project Ownership
 *
 * Migrate từ stored procedure: transfer_project_ownership
 *
 * Business rules:
 * - Chỉ owner hoặc org_admin mới có thể transfer
 * - Không thể transfer cho chính mình
 * - New owner phải là member của organization
 * - Thêm new owner vào project_members nếu chưa có
 * - Cập nhật role: old owner → project_manager, new owner → project_owner
 */
export default class TransferProjectOwnershipCommand {
  constructor(
    protected execCtx: ExecutionContext,
    private createNotification: CreateNotification
  ) {}

  async execute(dto: TransferProjectOwnershipDTO): Promise<Project> {
    const currentUserId = this.execCtx.userId
    if (!currentUserId) {
      throw new UnauthorizedException()
    }
    const trx: TransactionClientContract = await db.transaction()

    try {
      // 1. Load project with lock
      const project = await Project.query({ client: trx })
        .where('id', dto.project_id)
        .whereNull('deleted_at')
        .forUpdate()
        .firstOrFail()

      const currentOwnerId = project.owner_id

      // 2-4. Validate permissions via pure rule
      const orgMembership = await OrganizationUser.findMembership(
        project.organization_id,
        currentUserId,
        trx
      )
      const isNewOwnerOrgMember = await OrganizationUser.isApprovedMember(
        project.organization_id,
        dto.new_owner_id,
        trx
      )

      enforcePolicy(
        canTransferProjectOwnership({
          actorId: currentUserId,
          actorOrgRole: orgMembership?.org_role ?? null,
          projectOwnerId: currentOwnerId ?? '',
          newOwnerId: dto.new_owner_id,
          isNewOwnerOrgMember,
        })
      )

      // 5. Add new owner to project_members if not already
      const existingMember = await ProjectMember.findMember(dto.project_id, dto.new_owner_id, trx)

      if (!existingMember) {
        await ProjectMember.addMember(dto.project_id, dto.new_owner_id, ProjectRole.OWNER, trx)
      } else {
        // Update to project_owner role
        await ProjectMember.updateRole(dto.project_id, dto.new_owner_id, ProjectRole.OWNER, trx)
      }

      // 6. Demote old owner to project_manager
      if (currentOwnerId) {
        await ProjectMember.updateRole(dto.project_id, currentOwnerId, ProjectRole.MANAGER, trx)
      }

      // 7. Update project owner
      project.owner_id = String(dto.new_owner_id)
      await project.useTransaction(trx).save()

      // 8. Create audit log
      await AuditLog.create(
        {
          user_id: currentUserId,
          action: 'transfer_ownership',
          entity_type: EntityType.PROJECT,
          entity_id: dto.project_id,
          old_values: { owner_id: currentOwnerId },
          new_values: { owner_id: dto.new_owner_id },
          ip_address: this.execCtx.ip,
          user_agent: this.execCtx.userAgent,
        },
        { client: trx }
      )

      await trx.commit()

      // Emit domain event
      void emitter.emit('project:ownership:transferred', {
        projectId: dto.project_id,
        fromUserId: String(currentOwnerId ?? ''),
        toUserId: dto.new_owner_id,
        transferredBy: currentUserId,
      })

      // Invalidate project caches
      await CacheService.deleteByPattern(`organization:tasks:*`)

      // 9. Send notifications
      if (currentOwnerId) {
        await this.sendNotifications(project, currentOwnerId, dto.new_owner_id)
      }

      return project
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  private async sendNotifications(
    project: Project,
    oldOwnerId: DatabaseId,
    newOwnerId: DatabaseId
  ): Promise<void> {
    try {
      await this.createNotification.handle({
        user_id: newOwnerId,
        title: 'Bạn đã trở thành project owner',
        message: `Bạn đã được chuyển giao quyền sở hữu project "${project.name}".`,
        type: 'project_ownership_transferred',
        related_entity_type: 'project',
        related_entity_id: project.id,
      })

      await this.createNotification.handle({
        user_id: oldOwnerId,
        title: 'Đã chuyển giao quyền sở hữu project',
        message: `Quyền sở hữu project "${project.name}" đã được chuyển giao.`,
        type: 'project_ownership_transferred',
        related_entity_type: 'project',
        related_entity_id: project.id,
      })
    } catch (error) {
      loggerService.error('[TransferProjectOwnershipCommand] Failed to send notifications:', error)
    }
  }
}
