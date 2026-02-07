import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import Project from '#models/project'
import AuditLog from '#models/audit_log'
import type CreateNotification from '#actions/common/create_notification'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { OrganizationUserStatus } from '#constants/organization_constants'
import { ProjectRole } from '#constants/project_constants'
import { EntityType } from '#constants/audit_constants'
import PermissionService from '#services/permission_service'
import CacheService from '#services/cache_service'

/**
 * DTO for transferring project ownership
 */
export interface TransferProjectOwnershipDTO {
  project_id: number
  new_owner_id: number
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
    protected ctx: HttpContext,
    private createNotification: CreateNotification
  ) {}

  async execute(dto: TransferProjectOwnershipDTO): Promise<Project> {
    const currentUser = this.ctx.auth.user
    if (!currentUser) {
      throw new Error('Unauthorized')
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

      // 2. Cannot transfer to self
      if (currentUser.id === dto.new_owner_id) {
        throw new Error('Không thể transfer ownership cho chính mình')
      }

      // 3. Check permission: owner or org_admin or system superadmin
      const isOrgAdmin = await PermissionService.isOrgAdminOrOwner(
        currentUser.id,
        project.organization_id,
        trx
      )

      if (currentOwnerId !== currentUser.id && !isOrgAdmin) {
        throw new Error('Chỉ owner hiện tại hoặc org_admin mới có thể transfer ownership')
      }

      // 4. Validate new owner is member of organization
      const newOwnerInOrg = (await trx
        .from('organization_users')
        .where('user_id', dto.new_owner_id)
        .where('organization_id', project.organization_id)
        .where('status', OrganizationUserStatus.APPROVED)
        .first()) as { id: number } | null

      if (!newOwnerInOrg) {
        throw new Error('Owner mới phải là member của organization')
      }

      // 5. Add new owner to project_members if not already
      const existingMember = (await trx
        .from('project_members')
        .where('user_id', dto.new_owner_id)
        .where('project_id', dto.project_id)
        .first()) as { id: number } | null

      if (!existingMember) {
        await trx.table('project_members').insert({
          project_id: dto.project_id,
          user_id: dto.new_owner_id,
          project_role_id: ProjectRole.OWNER,
          created_at: new Date(),
        })
      } else {
        // Update to project_owner role
        await trx
          .from('project_members')
          .where('user_id', dto.new_owner_id)
          .where('project_id', dto.project_id)
          .update({ project_role_id: ProjectRole.OWNER })
      }

      // 6. Demote old owner to project_manager
      if (currentOwnerId) {
        await trx
          .from('project_members')
          .where('user_id', currentOwnerId)
          .where('project_id', dto.project_id)
          .update({ project_role_id: ProjectRole.MANAGER })
      }

      // 7. Update project owner
      project.owner_id = dto.new_owner_id
      await project.useTransaction(trx).save()

      // 8. Create audit log
      await AuditLog.create(
        {
          user_id: currentUser.id,
          action: 'transfer_ownership',
          entity_type: EntityType.PROJECT,
          entity_id: dto.project_id,
          old_values: { owner_id: currentOwnerId },
          new_values: { owner_id: dto.new_owner_id },
          ip_address: this.ctx.request.ip(),
          user_agent: this.ctx.request.header('user-agent') || '',
        },
        { client: trx }
      )

      await trx.commit()

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
    oldOwnerId: number,
    newOwnerId: number
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
      console.error('[TransferProjectOwnershipCommand] Failed to send notifications:', error)
    }
  }
}
