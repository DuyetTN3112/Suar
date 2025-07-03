import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import CreateAuditLog from '#actions/audit/create_audit_log'
import { enforcePolicy } from '#actions/authorization/enforce_policy'
import type CreateNotification from '#actions/common/create_notification'
import { EntityType } from '#constants/audit_constants'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
} from '#constants/notification_constants'
import { OrganizationRole } from '#constants/organization_constants'
import { canTransferOwnership } from '#domain/organizations/org_permission_policy'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import CacheService from '#infra/cache/cache_service'
import loggerService from '#infra/logger/logger_service'
import OrganizationRepository from '#infra/organizations/repositories/organization_repository'
import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'
import type Organization from '#models/organization'
import type { DatabaseId } from '#types/database'
import { type ExecutionContext } from '#types/execution_context'

/**
 * DTO for transferring organization ownership
 */
export interface TransferOrganizationOwnershipDTO {
  organization_id: DatabaseId
  new_owner_id: DatabaseId
}

interface OwnershipTransferContext {
  organization: Organization
  oldOwnerId: DatabaseId
  newOwnerRole: string | null
  isNewOwnerApprovedMember: boolean
}

interface PersistedOwnershipTransfer {
  organization: Organization
  oldOwnerId: DatabaseId
  newOwnerRole: string | null
}

/**
 * Command: Transfer Organization Ownership
 *
 * Migrate từ stored procedure: transfer_organization_ownership
 *
 * Pattern: FETCH → DECIDE → PERSIST → POST-COMMIT
 */
export default class TransferOrganizationOwnershipCommand {
  constructor(
    protected execCtx: ExecutionContext,
    private createNotification: CreateNotification
  ) {}

  async execute(dto: TransferOrganizationOwnershipDTO): Promise<Organization> {
    const actorId = this.requireActorId()
    const transfer = await this.persistOwnershipTransferInTransaction(dto, actorId)
    await this.runPostCommitEffects(transfer, actorId, dto)
    return transfer.organization
  }

  private requireActorId(): DatabaseId {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }
    const trx = await db.transaction()

    try {
      // ── FETCH ──────────────────────────────────────────────────────────
      const organization = await OrganizationRepository.findActiveForUpdate(
        dto.organization_id,
        trx
      )

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

      organization.owner_id = dto.new_owner_id
      await OrganizationRepository.save(organization, trx)

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

      await new CreateAuditLog(this.execCtx).handle({
        user_id: userId,
        action: 'transfer_ownership',
        entity_type: EntityType.ORGANIZATION,
        entity_id: dto.organization_id,
        old_values: { owner_id: oldOwnerId },
        new_values: { owner_id: dto.new_owner_id },
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
    organization: import('#models/organization').default,
    oldOwnerId: DatabaseId,
    newOwnerId: DatabaseId
  ): Promise<void> {
    try {
      // Notify new owner
      await this.createNotification.handle({
        user_id: newOwnerId,
        title: 'Bạn đã trở thành owner',
        message: `Bạn đã được chuyển giao quyền sở hữu tổ chức "${organization.name}".`,
        type: BACKEND_NOTIFICATION_TYPES.OWNERSHIP_TRANSFERRED,
        related_entity_type: BACKEND_NOTIFICATION_ENTITY_TYPES.ORGANIZATION,
        related_entity_id: organization.id,
      })

      // Notify old owner
      await this.createNotification.handle({
        user_id: oldOwnerId,
        title: 'Đã chuyển giao quyền sở hữu',
        message: `Bạn đã chuyển giao quyền sở hữu tổ chức "${organization.name}".`,
        type: BACKEND_NOTIFICATION_TYPES.OWNERSHIP_TRANSFERRED,
        related_entity_type: BACKEND_NOTIFICATION_ENTITY_TYPES.ORGANIZATION,
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
