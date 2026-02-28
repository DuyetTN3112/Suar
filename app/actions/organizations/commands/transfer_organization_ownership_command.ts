import { type ExecutionContext } from '#types/execution_context'
import db from '@adonisjs/lucid/services/db'
import Organization from '#models/organization'
import AuditLog from '#models/audit_log'
import OrganizationUser from '#models/organization_user'
import { OrganizationRole } from '#constants'
import type CreateNotification from '#actions/common/create_notification'
import { EntityType } from '#constants/audit_constants'
import CacheService from '#services/cache_service'
import emitter from '@adonisjs/core/services/emitter'
import loggerService from '#services/logger_service'
import type { DatabaseId } from '#types/database'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import ForbiddenException from '#exceptions/forbidden_exception'
import BusinessLogicException from '#exceptions/business_logic_exception'

/**
 * DTO for transferring organization ownership
 */
export interface TransferOrganizationOwnershipDTO {
  organization_id: DatabaseId
  new_owner_id: DatabaseId
}

/**
 * Command: Transfer Organization Ownership
 *
 * Migrate từ stored procedure: transfer_organization_ownership
 *
 * Business rules:
 * - Chỉ owner hiện tại mới có thể transfer
 * - Không thể transfer cho chính mình
 * - New owner phải là member approved
 * - New owner phải có role ít nhất là org_admin
 * - Cập nhật role: old owner → org_admin, new owner → org_owner
 *
 * @example
 * const command = new TransferOrganizationOwnershipCommand(ctx, createNotification)
 * await command.execute(dto)
 */
export default class TransferOrganizationOwnershipCommand {
  constructor(
    protected execCtx: ExecutionContext,
    private createNotification: CreateNotification
  ) {}

  async execute(dto: TransferOrganizationOwnershipDTO): Promise<Organization> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }
    const trx = await db.transaction()

    try {
      // 1. Load organization with lock
      const organization = await Organization.query({ client: trx })
        .where('id', dto.organization_id)
        .whereNull('deleted_at')
        .forUpdate()
        .firstOrFail()

      // 2. Validate current user is owner
      if (organization.owner_id !== userId) {
        throw new ForbiddenException('Chỉ owner hiện tại mới có thể transfer ownership')
      }

      // 3. Cannot transfer to self
      if (userId === dto.new_owner_id) {
        throw new BusinessLogicException('Không thể transfer ownership cho chính mình')
      }

      // 4. Validate new owner is approved member
      await OrganizationUser.findApprovedMemberOrFail(dto.organization_id, dto.new_owner_id, trx)

      // 5. Validate new owner has at least org_admin role
      const newOwnerRoleName = await OrganizationUser.getMemberRoleName(
        dto.organization_id,
        dto.new_owner_id,
        trx
      )
      if (!newOwnerRoleName || ![OrganizationRole.OWNER, OrganizationRole.ADMIN].includes(newOwnerRoleName as OrganizationRole)) {
        throw new BusinessLogicException('Owner mới phải có vai trò ít nhất là org_admin')
      }

      // 6. v3: Use inline role strings directly (no DB lookup)

      // Save old values for audit
      const oldOwnerId = organization.owner_id

      // 7. Update organization owner
      organization.owner_id = String(dto.new_owner_id)
      await organization.useTransaction(trx).save()

      // 8. Demote old owner to org_admin
      await OrganizationUser.updateRole(dto.organization_id, userId, OrganizationRole.ADMIN, trx)

      // 9. Promote new owner to org_owner
      await OrganizationUser.updateRole(
        dto.organization_id,
        dto.new_owner_id,
        OrganizationRole.OWNER,
        trx
      )

      // 10. Create audit log
      await AuditLog.create(
        {
          user_id: userId,
          action: 'transfer_ownership',
          entity_type: EntityType.ORGANIZATION,
          entity_id: dto.organization_id,
          old_values: { owner_id: oldOwnerId },
          new_values: { owner_id: dto.new_owner_id },
          ip_address: this.execCtx.ip,
          user_agent: this.execCtx.userAgent,
        },
        { client: trx }
      )

      await trx.commit()

      // Emit domain event
      void emitter.emit('organization:updated', {
        organization,
        updatedBy: userId,
        changes: { owner_id: dto.new_owner_id, old_owner_id: oldOwnerId },
      })

      // Invalidate organization caches
      await CacheService.deleteByPattern(`organization:*`)
      await CacheService.deleteByPattern(`organization:members:*`)

      // 11. Send notifications (outside transaction)
      await this.sendNotifications(organization, userId, dto.new_owner_id)

      return organization
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  /**
   * Send notifications to both old and new owners
   */
  private async sendNotifications(
    organization: Organization,
    oldOwnerId: DatabaseId,
    newOwnerId: DatabaseId
  ): Promise<void> {
    try {
      // Notify new owner
      await this.createNotification.handle({
        user_id: newOwnerId,
        title: 'Bạn đã trở thành owner',
        message: `Bạn đã được chuyển giao quyền sở hữu tổ chức "${organization.name}".`,
        type: 'ownership_transferred',
        related_entity_type: 'organization',
        related_entity_id: organization.id,
      })

      // Notify old owner
      await this.createNotification.handle({
        user_id: oldOwnerId,
        title: 'Đã chuyển giao quyền sở hữu',
        message: `Bạn đã chuyển giao quyền sở hữu tổ chức "${organization.name}".`,
        type: 'ownership_transferred',
        related_entity_type: 'organization',
        related_entity_id: organization.id,
      })
    } catch (error) {
      loggerService.error(
        '[TransferOrganizationOwnershipCommand] Failed to send notifications:',
        error
      )
    }
  }
}
