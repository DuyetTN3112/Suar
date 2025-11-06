import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import loggerService from '#modules/logger/public_contracts/logger_service'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
} from '#modules/notifications/public_contracts/notification_constants'
import type { NotificationCreator } from '#modules/notifications/public_contracts/notification_creator'
import type { OrganizationActionContext } from '#modules/organizations/actions/organization_action_context'
import { canTransferOwnership } from '#modules/organizations/domain/org_permission_policy'
import * as membershipQueries from '#modules/organizations/infra/repositories/organization_user_repository/read/membership_queries'
import * as membershipMutations from '#modules/organizations/infra/repositories/organization_user_repository/write/mutation_queries'
import * as OrganizationMutations from '#modules/organizations/infra/repositories/write/organization_mutations'
import { OrganizationRole } from '#modules/organizations/public_contracts/organization_constants'
import type { OrganizationRecord } from '#modules/organizations/types/organization_records'

/**
 * DTO for transferring organization ownership
 */
export interface TransferOrganizationOwnershipDTO {
  organization_id: string
  new_owner_id: string
}

interface OwnershipTransferContext {
  organization: OrganizationRecord
  oldOwnerId: string
  newOwnerRole: string | null
  isNewOwnerApprovedMember: boolean
}

interface PersistedOwnershipTransfer {
  organization: OrganizationRecord
  oldOwnerId: string
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
    protected execCtx: OrganizationActionContext,
    private createNotification: NotificationCreator
  ) {}

  async execute(dto: TransferOrganizationOwnershipDTO): Promise<OrganizationRecord> {
    const actorId = this.requireActorId()
    const transfer = await this.persistOwnershipTransferInTransaction(dto, actorId)
    await this.runPostCommitEffects(transfer, actorId, dto)
    return transfer.organization
  }

  private requireActorId(): string {
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

    const isNewOwnerApprovedMember = await membershipQueries.isApprovedMember(
      dto.new_owner_id,
      dto.organization_id,
      trx
    )
    const newOwnerMembership = await membershipQueries.getMembershipContext(
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
    actorId: string,
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
    actorId: string,
    context: OwnershipTransferContext,
    trx: TransactionClientContract
  ): Promise<PersistedOwnershipTransfer> {
    const updatedOrganization = await OrganizationMutations.updateOwnerRecord(
      context.organization.id,
      dto.new_owner_id,
      trx
    )

    await membershipMutations.updateRole(
      dto.organization_id,
      context.oldOwnerId,
      OrganizationRole.ADMIN,
      trx
    )

    await membershipMutations.updateRole(
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
    actorId: string
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
    actorId: string,
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
      cacheStore.deleteByPattern('organization:*'),
      cacheStore.deleteByPattern('organization:members:*'),
    ])

    await this.sendNotifications(transfer.organization, transfer.oldOwnerId, dto.new_owner_id)
  }

  /**
   * Send notifications to both old and new owners
   */
  private async sendNotifications(
    organization: OrganizationRecord,
    oldOwnerId: string,
    newOwnerId: string
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
