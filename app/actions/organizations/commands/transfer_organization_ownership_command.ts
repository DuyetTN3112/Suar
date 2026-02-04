import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { auditPublicApi } from '#actions/audit/public_api'
import { enforcePolicy } from '#actions/authorization/public_api'
import type { NotificationCreator } from '#actions/notifications/public_api'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import CacheService from '#infra/cache/cache_service'
import loggerService from '#infra/logger/logger_service'
import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'
import * as OrganizationMutations from '#infra/organizations/repositories/write/organization_mutations'
import { EntityType } from '#modules/audit/constants/audit_constants'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
} from '#modules/notifications/constants/notification_constants'
import { OrganizationRole } from '#modules/organizations/constants/organization_constants'
import { canTransferOwnership } from '#modules/organizations/domain/org_permission_policy'
import type { DatabaseId } from '#types/database'
import { type ExecutionContext } from '#types/execution_context'
import type { OrganizationRecord } from '#types/organization_records'

/**
 * DTO for transferring organization ownership
 */
export interface TransferOrganizationOwnershipDTO {
  organization_id: DatabaseId
  new_owner_id: DatabaseId
}

interface OwnershipTransferContext {
  organization: OrganizationRecord
  oldOwnerId: DatabaseId
  newOwnerRole: string | null
  isNewOwnerApprovedMember: boolean
}

interface PersistedOwnershipTransfer {
  organization: OrganizationRecord
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
    private createNotification: NotificationCreator
  ) {}

  async execute(dto: TransferOrganizationOwnershipDTO): Promise<OrganizationRecord> {
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

    return userId
  }

  private async loadOwnershipTransferContext(
    dto: TransferOrganizationOwnershipDTO,
    trx: TransactionClientContract
  ): Promise<OwnershipTransferContext> {
    const organization = await OrganizationMutations.findActiveForUpdateRecord(
      dto.organization_id,
      trx
    )
    const oldOwnerId = organization.owner_id

    const isNewOwnerApprovedMember = await OrganizationUserRepository.isApprovedMember(
      dto.new_owner_id,
      dto.organization_id,
      trx
    )
    const newOwnerMembership = await OrganizationUserRepository.getMembershipContext(
      dto.organization_id,
      dto.new_owner_id,
      trx
    )
    const newOwnerRole = newOwnerMembership?.role ?? null

    return {
      organization,
      oldOwnerId,
      newOwnerRole,
      isNewOwnerApprovedMember,
    }
  }

  private validateOwnershipTransfer(
    actorId: DatabaseId,
    dto: TransferOrganizationOwnershipDTO,
    context: OwnershipTransferContext
  ): void {
    enforcePolicy(
      canTransferOwnership({
        actorId,
        currentOwnerId: context.oldOwnerId,
        newOwnerId: dto.new_owner_id,
        newOwnerRole: context.newOwnerRole,
        isNewOwnerApprovedMember: context.isNewOwnerApprovedMember,
      })
    )
  }

  private async persistOwnershipTransfer(
    dto: TransferOrganizationOwnershipDTO,
    actorId: DatabaseId,
    context: OwnershipTransferContext,
    trx: TransactionClientContract
  ): Promise<PersistedOwnershipTransfer> {
    const updatedOrganization = await OrganizationMutations.updateOwnerRecord(
      context.organization.id,
      dto.new_owner_id,
      trx
    )

    await OrganizationUserRepository.updateRole(
      dto.organization_id,
      context.oldOwnerId,
      OrganizationRole.ADMIN,
      trx
    )

    await OrganizationUserRepository.updateRole(
      dto.organization_id,
      dto.new_owner_id,
      OrganizationRole.OWNER,
      trx
    )

    await auditPublicApi.log(
      {
        user_id: actorId,
        action: 'transfer_ownership',
        entity_type: EntityType.ORGANIZATION,
        entity_id: dto.organization_id,
        old_values: { owner_id: context.oldOwnerId },
        new_values: { owner_id: dto.new_owner_id },
      },
      this.execCtx
    )

    return {
      organization: updatedOrganization,
      oldOwnerId: context.oldOwnerId,
      newOwnerRole: context.newOwnerRole,
    }
  }

  private async persistOwnershipTransferInTransaction(
    dto: TransferOrganizationOwnershipDTO,
    actorId: DatabaseId
  ): Promise<PersistedOwnershipTransfer> {
    const trx = await db.transaction()

    try {
      const context = await this.loadOwnershipTransferContext(dto, trx)
      this.validateOwnershipTransfer(actorId, dto, context)
      const transfer = await this.persistOwnershipTransfer(dto, actorId, context, trx)
      await trx.commit()
      return transfer
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  private async runPostCommitEffects(
    transfer: PersistedOwnershipTransfer,
    actorId: DatabaseId,
    dto: TransferOrganizationOwnershipDTO
  ): Promise<void> {
    void emitter.emit('organization:updated', {
      organizationId: transfer.organization.id,
      updatedBy: actorId,
      changes: { owner_id: dto.new_owner_id, old_owner_id: transfer.oldOwnerId },
    })

    void emitter.emit('organization:member:role_changed', {
      organizationId: dto.organization_id,
      userId: transfer.oldOwnerId,
      oldRole: OrganizationRole.OWNER,
      newRole: OrganizationRole.ADMIN,
      changedBy: actorId,
    })

    void emitter.emit('organization:member:role_changed', {
      organizationId: dto.organization_id,
      userId: dto.new_owner_id,
      oldRole: transfer.newOwnerRole ?? OrganizationRole.MEMBER,
      newRole: OrganizationRole.OWNER,
      changedBy: actorId,
    })

    await Promise.all([
      CacheService.deleteByPattern('organization:*'),
      CacheService.deleteByPattern('organization:members:*'),
    ])

    await this.sendNotifications(transfer.organization, transfer.oldOwnerId, dto.new_owner_id)
  }

  /**
   * Send notifications to both old and new owners
   */
  private async sendNotifications(
    organization: OrganizationRecord,
    oldOwnerId: DatabaseId,
    newOwnerId: DatabaseId
  ): Promise<void> {
    try {
      await this.createNotification.handle({
        user_id: newOwnerId,
        title: 'Bạn đã trở thành owner',
        message: `Bạn đã được chuyển giao quyền sở hữu tổ chức "${organization.name}".`,
        type: BACKEND_NOTIFICATION_TYPES.OWNERSHIP_TRANSFERRED,
        related_entity_type: BACKEND_NOTIFICATION_ENTITY_TYPES.ORGANIZATION,
        related_entity_id: organization.id,
      })

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
