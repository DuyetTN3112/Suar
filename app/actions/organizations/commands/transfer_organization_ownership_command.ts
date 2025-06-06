import { type ExecutionContext } from '#types/execution_context'
import db from '@adonisjs/lucid/services/db'
import Organization from '#models/organization'
import AuditLog from '#models/mongo/audit_log'
import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'
import { OrganizationRole } from '#constants'
import type CreateNotification from '#actions/common/create_notification'
import { EntityType } from '#constants/audit_constants'
import CacheService from '#services/cache_service'
import emitter from '@adonisjs/core/services/emitter'
import loggerService from '#services/logger_service'
import type { DatabaseId } from '#types/database'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import { enforcePolicy } from '#actions/shared/enforce_policy'
import { canTransferOwnership } from '#domain/organizations/org_permission_policy'

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
 * Pattern: FETCH → DECIDE → PERSIST
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
      // ── FETCH ──────────────────────────────────────────────────────────
      const organization = await Organization.query({ client: trx })
        .where('id', dto.organization_id)
        .whereNull('deleted_at')
        .forUpdate()
        .firstOrFail()

      const [isNewOwnerApproved, newOwnerRoleName] = await Promise.all([
        OrganizationUserRepository.isApprovedMember(dto.new_owner_id, dto.organization_id, trx),
        OrganizationUserRepository.getMemberRoleName(dto.organization_id, dto.new_owner_id, trx),
      ])

      // ── DECIDE (pure, sync) ────────────────────────────────────────────
      enforcePolicy(
        canTransferOwnership({
          actorId: userId,
          currentOwnerId: organization.owner_id,
          newOwnerId: dto.new_owner_id,
          newOwnerRole: newOwnerRoleName,
          isNewOwnerApprovedMember: isNewOwnerApproved,
        })
      )

      // ── PERSIST ────────────────────────────────────────────────────────
      const oldOwnerId = organization.owner_id

      organization.owner_id = String(dto.new_owner_id)
      await organization.useTransaction(trx).save()

      // Demote old owner to org_admin
      await OrganizationUserRepository.updateRole(
        dto.organization_id,
        userId,
        OrganizationRole.ADMIN,
        trx
      )

      // Promote new owner to org_owner
      await OrganizationUserRepository.updateRole(
        dto.organization_id,
        dto.new_owner_id,
        OrganizationRole.OWNER,
        trx
      )

      await AuditLog.create({
        user_id: userId,
        action: 'transfer_ownership',
        entity_type: EntityType.ORGANIZATION,
        entity_id: dto.organization_id,
        old_values: { owner_id: oldOwnerId },
        new_values: { owner_id: dto.new_owner_id },
        ip_address: this.execCtx.ip,
        user_agent: this.execCtx.userAgent,
      })

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

      // Send notifications (outside transaction)
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
