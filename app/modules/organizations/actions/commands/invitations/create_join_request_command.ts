import { AuditAction, EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
} from '#modules/notifications/public_contracts/notification_constants'
import { buildNotificationEventId } from '#modules/notifications/public_contracts/notification_event_identity'
import type { OrganizationActionContext } from '#modules/organizations/actions/action_context'
import type { OrganizationUserReaderWriter } from '#modules/organizations/actions/ports/outbound/invitations/organization_external_dependencies'
import type { OrganizationNotificationStager } from '#modules/organizations/actions/ports/outbound/invitations/organization_notification_stager'
import type {
  OrganizationMembershipRepository,
  OrganizationReader,
} from '#modules/organizations/actions/ports/outbound/invitations/organization_persistence'
import type { OrganizationTransactionRunner } from '#modules/organizations/actions/ports/outbound/organization_transaction'
import {
  OrganizationRole,
  OrganizationUserStatus,
} from '#modules/organizations/public_contracts/access/organization_constants'

/**
 * Command: Create Join Request
 *
 * Persist pending membership, audit log, and post-commit event for a join request.
 * Eligibility and orchestration stay in RequestOrganizationJoinCommand.
 */
export default class CreateJoinRequestCommand {
  constructor(
    protected execCtx: OrganizationActionContext,
    private readonly users: OrganizationUserReaderWriter,
    private readonly notificationStager: OrganizationNotificationStager,
    private readonly transactionRunner: OrganizationTransactionRunner,
    private readonly organizations: OrganizationReader,
    private readonly memberships: OrganizationMembershipRepository
  ) {}

  async execute(organizationId: string): Promise<void> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException('Unauthorized')
    }
    await this.transactionRunner.run(async (trx) => {
      const requester = await this.users.findUserIdentity(userId, trx)
      if (!requester) {
        throw NotFoundException.user(userId)
      }

      const existingMembership = await this.memberships.find(organizationId, userId, trx)
      const organization = await this.organizations.findById(organizationId, trx)
      if (!organization) {
        throw NotFoundException.organization(organizationId)
      }

      if (existingMembership?.status === OrganizationUserStatus.REJECTED) {
        await this.memberships.updateStatus(organizationId, userId, 'pending', trx)
      } else {
        await this.memberships.add(
          {
            organization_id: organizationId,
            user_id: userId,
            org_role: OrganizationRole.MEMBER,
            status: OrganizationUserStatus.PENDING,
          },
          trx
        )
      }

      await auditPublicApi.log(
        {
          user_id: userId,
          action: AuditAction.JOIN,
          entity_type: EntityType.ORGANIZATION,
          entity_id: organizationId,
          affected_user_ids: [userId],
          new_values: {
            user_id: userId,
            organization_id: organizationId,
            status: OrganizationUserStatus.PENDING,
          },
        },
        this.execCtx,
        { trx, critical: true }
      )

      const approverIds = await this.memberships.listMemberUserIds(
        organizationId,
        OrganizationUserStatus.APPROVED,
        trx
      )
      const approverMemberships = await Promise.all(
        approverIds.map(async (recipientId) => {
          const membership = await this.memberships.find(organizationId, recipientId, trx)
          return membership?.org_role === OrganizationRole.OWNER ||
            membership?.org_role === OrganizationRole.ADMIN
            ? { recipientId, role: membership.org_role }
            : null
        })
      )
      const recipients = approverMemberships.filter((membership) => membership !== null)

      const membership = await this.memberships.find(organizationId, userId, trx)
      const occurredAt = membership?.created_at.toISOString()
      if (!occurredAt) {
        throw new InvariantViolationException(
          'Persisted join request is missing its creation timestamp'
        )
      }

      for (const recipient of recipients) {
        await this.notificationStager.stage(
          {
            eventId: buildNotificationEventId({
              eventName: 'organization.join_request_created',
              businessEventId: `${organizationId}:${userId}:${occurredAt}`,
              recipientId: recipient.recipientId,
            }),
            schemaVersion: 1,
            type: BACKEND_NOTIFICATION_TYPES.ORGANIZATION_JOIN_REQUEST,
            recipientId: recipient.recipientId,
            scope: { kind: 'organization', id: organizationId },
            actor: { type: 'user', id: userId },
            subject: {
              type: BACKEND_NOTIFICATION_ENTITY_TYPES.ORGANIZATION,
              id: organizationId,
            },
            parameters: {
              organizationName: organization.name,
              requesterId: userId,
              requesterName: requester.username,
            },
            occurredAt,
            correlationId: `${organizationId}:${userId}`,
          },
          { trx }
        )
      }

    })
  }
}
