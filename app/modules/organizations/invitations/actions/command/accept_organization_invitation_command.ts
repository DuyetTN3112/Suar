import { EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import loggerService from '#modules/logger/public_contracts/application_logger'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
} from '#modules/notifications/public_contracts/notification_constants'
import { buildNotificationEventId } from '#modules/notifications/public_contracts/notification_event_identity'
import {
  platformOperationalLogger,
  platformWorkflowLogger,
} from '#modules/observability/public_contracts/platform_observability'
import type { OrganizationActionContext } from '#modules/organizations/invitations/actions/action_context'
import type { OrganizationEventPublisher } from '#modules/organizations/invitations/actions/ports/outbound/organization_event_publisher'
import type { OrganizationNotificationStager } from '#modules/organizations/invitations/actions/ports/outbound/organization_notification_stager'
import type {
  OrganizationMembershipRepository,
  OrganizationReader,
} from '#modules/organizations/invitations/actions/ports/outbound/organization_persistence'
import type { OrganizationTransactionRunner } from '#modules/organizations/invitations/actions/ports/outbound/organization_transaction'
import { buildOrganizationMembershipEvent } from '#modules/organizations/invitations/observability/organization_event_factory'

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

export default class AcceptOrganizationInvitationCommand {
  constructor(
    protected execCtx: OrganizationActionContext,
    private notificationStager: OrganizationNotificationStager,
    private readonly transactionRunner: OrganizationTransactionRunner,
    private readonly organizations: OrganizationReader,
    private readonly memberships: OrganizationMembershipRepository,
    private readonly organizationEventPublisher: OrganizationEventPublisher
  ) {}

  async execute(organizationId: string): Promise<void> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }
    const startedAt = Date.now()

    platformOperationalLogger.log(
      'info',
      buildOrganizationMembershipEvent(this.execCtx, {
        eventName: 'organization_invitation_accepted',
        eventFamily: 'membership',
        subsystem: 'organization_users',
        workflow: 'organization_accept_invitation',
        stage: 'started',
        outcome: 'success',
        organizationId: organizationId,
        targetType: 'organization_invitation',
        targetId: userId,
        change: {
          target_user_id: userId,
          decision: 'approved',
        },
        retentionClass: 'transient_runtime',
      })
    )

    let acceptedInvitation: {
      orgRole: string
      invitedBy: string
    }
    try {
      acceptedInvitation = await this.transactionRunner.run(async (trx) => {
        const pendingInvitation = await this.memberships.findPending(organizationId, userId, trx)

        if (!pendingInvitation || !pendingInvitation.invited_by) {
          throw new NotFoundException('Không tìm thấy lời mời đang chờ xử lý')
        }
        const organization = await this.organizations.findById(organizationId, trx)
        if (!organization) {
          throw NotFoundException.resource('Tổ chức', organizationId)
        }

        await this.memberships.updateStatus(organizationId, userId, 'approved', trx)

        await auditPublicApi.log(
          {
            user_id: userId,
            action: 'accept_invitation',
            entity_type: EntityType.ORGANIZATION,
            entity_id: organizationId,
            affected_user_ids: [userId],
            old_values: {
              organization_id: pendingInvitation.organization_id,
              user_id: pendingInvitation.user_id,
              status: pendingInvitation.status,
            },
            new_values: {
              status: 'approved',
              action: 'accept',
            },
          },
          this.execCtx,
          { trx, critical: true }
        )

        const occurredAt = pendingInvitation.created_at.toISOString()
        if (!occurredAt) {
          throw new InvariantViolationException(
            'Persisted organization invitation is missing its creation timestamp'
          )
        }
        await this.notificationStager.stage(
          {
            eventId: buildNotificationEventId({
              eventName: 'organization.invitation_accepted',
              businessEventId: `${organizationId}:${userId}:${occurredAt}`,
              recipientId: pendingInvitation.invited_by,
            }),
            schemaVersion: 1,
            type: BACKEND_NOTIFICATION_TYPES.ORGANIZATION_JOIN_APPROVED,
            recipientId: pendingInvitation.invited_by,
            scope: { kind: 'organization', id: organizationId },
            actor: { type: 'user', id: userId },
            subject: {
              type: BACKEND_NOTIFICATION_ENTITY_TYPES.ORGANIZATION,
              id: organizationId,
            },
            parameters: {
              organizationName: organization.name,
            },
            occurredAt,
            correlationId: `${organizationId}:${userId}`,
          },
          { trx }
        )

        return {
          orgRole: pendingInvitation.org_role,
          invitedBy: pendingInvitation.invited_by,
        }
      })
    } catch (error) {
      await platformWorkflowLogger.checkpointSafely(
        this.execCtx,
        buildOrganizationMembershipEvent(this.execCtx, {
          eventName: 'organization_invitation_accept_failed',
          eventFamily: 'membership',
          subsystem: 'organization_users',
          workflow: 'organization_accept_invitation',
          stage: 'failed',
          outcome: 'failure',
          organizationId: organizationId,
          targetType: 'organization_invitation',
          targetId: userId,
          change: {
            target_user_id: userId,
            decision: 'approved',
          },
          runtime: {
            duration_ms: Date.now() - startedAt,
          },
          error,
        })
      )
      throw error
    }

    await settlePostCommitEffect(
      'organization.invitation.accepted',
      () =>
        this.organizationEventPublisher.publishOrganizationMemberAdded({
          organizationId: organizationId,
          userId: userId,
          org_role: acceptedInvitation.orgRole,
          invitedBy: acceptedInvitation.invitedBy,
        }),
      {
        organizationId,
        actorId: userId,
      }
    )

    await platformWorkflowLogger.checkpointSafely(
      this.execCtx,
      buildOrganizationMembershipEvent(this.execCtx, {
        eventName: 'organization_invitation_accepted',
        eventFamily: 'membership',
        subsystem: 'organization_users',
        workflow: 'organization_accept_invitation',
        stage: 'completed',
        outcome: 'success',
        organizationId: organizationId,
        targetType: 'organization_invitation',
        targetId: userId,
        change: {
          target_user_id: userId,
          decision: 'approved',
        },
        runtime: {
          duration_ms: Date.now() - startedAt,
        },
      })
    )
  }
}
