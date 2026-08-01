import { EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import loggerService from '#modules/logger/public_contracts/application_logger'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
} from '#modules/notifications/public_contracts/notification_constants'
import { buildNotificationEventId } from '#modules/notifications/public_contracts/notification_event_identity'
import { canTransferOwnership } from '#modules/organizations/access/domain/org_permission_policy'
import { OrganizationRole } from '#modules/organizations/access/public_contracts/organization_constants'
import type { OrganizationActionContext } from '#modules/organizations/members/actions/action_context'
import type { OrganizationEventPublisher } from '#modules/organizations/members/actions/ports/outbound/organization_event_publisher'
import type { OrganizationUserReaderWriter } from '#modules/organizations/members/actions/ports/outbound/organization_external_dependencies'
import type { OrganizationNotificationStager } from '#modules/organizations/members/actions/ports/outbound/organization_notification_stager'
import type {
  OrganizationMembershipRepository,
  OrganizationRecord,
  OrganizationWriter,
} from '#modules/organizations/members/actions/ports/outbound/organization_persistence'
import type {
  OrganizationTransaction,
  OrganizationTransactionRunner,
} from '#modules/organizations/members/actions/ports/outbound/organization_transaction'

async function settlePostCommitEffect(
  effectName: string,
  effect: () => Promise<void>,
  context: { organizationId: string; actorId: string }
): Promise<void> {
  try {
    await effect()
  } catch (error) {
    try {
      loggerService.error('Organization post-commit effect failed', {
        effectName,
        committed: true,
        organizationId: context.organizationId,
        actorId: context.actorId,
        errorName: error instanceof Error ? error.name : 'UnknownError',
      })
    } catch {
      // Telemetry failure must not alter the result of an already committed mutation.
    }
  }
}

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
    private notificationStager: OrganizationNotificationStager,
    private readonly userReaderWriter: OrganizationUserReaderWriter,
    private readonly transactionRunner: OrganizationTransactionRunner,
    private readonly organizationWriter: OrganizationWriter,
    private readonly memberships: OrganizationMembershipRepository,
    private readonly organizationEventPublisher: OrganizationEventPublisher
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
    trx: OrganizationTransaction
  ): Promise<OwnershipTransferContext> {
    const organization = await this.organizationWriter.findActiveForUpdate(dto.organization_id, trx)
    const oldOwnerId = organization.owner_id

    const isNewOwnerApprovedMember = await this.memberships.isApprovedMember(
      dto.new_owner_id,
      dto.organization_id,
      trx
    )
    const newOwnerMembership = await this.memberships.getContext(
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
    context: OwnershipTransferContext,
    isNewOwnerActive: boolean
  ): void {
    if (!isNewOwnerActive) {
      throw new BusinessLogicException('Chủ sở hữu mới phải là người dùng active')
    }

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
    trx: OrganizationTransaction
  ): Promise<PersistedOwnershipTransfer> {
    const updatedOrganization = await this.organizationWriter.updateOwner(
      context.organization.id,
      dto.new_owner_id,
      trx
    )

    await this.memberships.updateRole(
      dto.organization_id,
      context.oldOwnerId,
      OrganizationRole.ADMIN,
      trx
    )

    await this.memberships.updateRole(
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
        affected_user_ids: [context.oldOwnerId, dto.new_owner_id],
        old_values: { owner_id: context.oldOwnerId },
        new_values: { owner_id: dto.new_owner_id },
      },
      this.execCtx,
      { trx, critical: true }
    )

    const occurredAt = updatedOrganization.updated_at
    if (!occurredAt) {
      throw new InvariantViolationException(
        'Persisted organization ownership transfer is missing its update timestamp'
      )
    }
    await this.stageNotifications(
      updatedOrganization,
      context.oldOwnerId,
      dto.new_owner_id,
      actorId,
      occurredAt,
      trx
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
    return this.transactionRunner.run(async (trx) => {
      const context = await this.loadOwnershipTransferContext(dto, trx)
      const isNewOwnerActive = await this.userReaderWriter.isActiveUser(dto.new_owner_id, trx)
      this.validateOwnershipTransfer(actorId, dto, context, isNewOwnerActive)
      return this.persistOwnershipTransfer(dto, actorId, context, trx)
    })
  }

  private async runPostCommitEffects(
    transfer: PersistedOwnershipTransfer,
    actorId: string,
    dto: TransferOrganizationOwnershipDTO
  ): Promise<void> {
    await settlePostCommitEffect(
      'organization.ownership.updated',
      () =>
        this.organizationEventPublisher.publishOrganizationUpdated({
          organizationId: transfer.organization.id,
          updatedBy: actorId,
          changes: { owner_id: dto.new_owner_id, old_owner_id: transfer.oldOwnerId },
        }),
      {
        organizationId: dto.organization_id,
        actorId,
      }
    )

    await settlePostCommitEffect(
      'organization.ownership.previous_owner_role_changed',
      () =>
        this.organizationEventPublisher.publishOrganizationMemberRoleChanged({
          organizationId: dto.organization_id,
          userId: transfer.oldOwnerId,
          oldRole: OrganizationRole.OWNER,
          newRole: OrganizationRole.ADMIN,
          changedBy: actorId,
        }),
      {
        organizationId: dto.organization_id,
        actorId,
      }
    )

    await settlePostCommitEffect(
      'organization.ownership.new_owner_role_changed',
      () =>
        this.organizationEventPublisher.publishOrganizationMemberRoleChanged({
          organizationId: dto.organization_id,
          userId: dto.new_owner_id,
          oldRole: transfer.newOwnerRole ?? OrganizationRole.MEMBER,
          newRole: OrganizationRole.OWNER,
          changedBy: actorId,
        }),
      {
        organizationId: dto.organization_id,
        actorId,
      }
    )
  }

  /**
   * Stage the bounded two-recipient ownership notification plan atomically.
   */
  private async stageNotifications(
    organization: OrganizationRecord,
    oldOwnerId: string,
    newOwnerId: string,
    actorId: string,
    occurredAt: string,
    trx: OrganizationTransaction
  ): Promise<void> {
    const recipients = [
      { recipientId: newOwnerId, ownershipRole: 'new_owner' },
      { recipientId: oldOwnerId, ownershipRole: 'previous_owner' },
    ] as const

    for (const recipient of recipients) {
      await this.notificationStager.stage(
        {
          eventId: buildNotificationEventId({
            eventName: 'organization.ownership_transferred',
            businessEventId: `${organization.id}:${oldOwnerId}:${newOwnerId}:${occurredAt}`,
            recipientId: recipient.recipientId,
          }),
          schemaVersion: 1,
          type: BACKEND_NOTIFICATION_TYPES.OWNERSHIP_TRANSFERRED,
          recipientId: recipient.recipientId,
          scope: { kind: 'organization', id: organization.id },
          actor: { type: 'user', id: actorId },
          subject: {
            type: BACKEND_NOTIFICATION_ENTITY_TYPES.ORGANIZATION,
            id: organization.id,
          },
          parameters: {
            organizationName: organization.name,
            ownershipRole: recipient.ownershipRole,
          },
          occurredAt,
          correlationId: `${organization.id}:${occurredAt}`,
        },
        { trx }
      )
    }
  }
}
