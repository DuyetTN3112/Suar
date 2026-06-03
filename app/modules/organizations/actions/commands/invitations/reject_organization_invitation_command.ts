import { EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import AppException from '#modules/errors/public_contracts/application_exception'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { Result } from '#modules/errors/public_contracts/result'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
} from '#modules/notifications/public_contracts/notification_constants'
import { buildNotificationEventId } from '#modules/notifications/public_contracts/notification_event_identity'
import {
  platformOperationalLogger,
  platformWorkflowLogger,
} from '#modules/observability/public_contracts/platform_observability'
import type { OrganizationActionContext } from '#modules/organizations/actions/action_context'
import type { OrganizationNotificationStager } from '#modules/organizations/actions/ports/outbound/invitations/organization_notification_stager'
import type {
  OrganizationMembershipRepository,
  OrganizationReader,
} from '#modules/organizations/actions/ports/outbound/invitations/organization_persistence'
import type { OrganizationTransactionRunner } from '#modules/organizations/actions/ports/outbound/organization_transaction'
import type { OrganizationCacheInvalidator } from '#modules/organizations/actions/ports/outbound/directory/organization_cache_invalidator'
import { BaseCommand } from '#modules/organizations/actions/commands/base_command'
import { buildOrganizationMembershipEvent } from '#modules/organizations/observability/invitations/organization_event_factory'

interface OrganizationInvitationInput {
  organizationId: string
}

export default class RejectOrganizationInvitationCommand extends BaseCommand<
  OrganizationInvitationInput,
  void
> {
  constructor(
    protected override execCtx: OrganizationActionContext,
    private notificationStager: OrganizationNotificationStager,
    private readonly invitationTransactionRunner: OrganizationTransactionRunner,
    private readonly organizations: OrganizationReader,
    private readonly memberships: OrganizationMembershipRepository,
    private readonly cacheInvalidator: OrganizationCacheInvalidator
  ) {
    super(execCtx, invitationTransactionRunner)
  }

  override async handle(input: OrganizationInvitationInput): Promise<void> {
    return this.execute(input.organizationId)
  }

  override async executeAndWrap(
    input: OrganizationInvitationInput
  ): Promise<Result<void, AppException>>
  override async executeAndWrap(organizationId: string): Promise<Result<void, AppException>>
  override async executeAndWrap(
    organizationIdOrInput: string | OrganizationInvitationInput
  ): Promise<Result<void, AppException>> {
    return super.executeAndWrap(
      typeof organizationIdOrInput === 'string'
        ? { organizationId: organizationIdOrInput }
        : organizationIdOrInput
    )
  }

  async execute(organizationId: string): Promise<void> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }
    const startedAt = Date.now()

    platformOperationalLogger.log(
      'info',
      buildOrganizationMembershipEvent(this.execCtx, {
        eventName: 'organization_invitation_rejected',
        eventFamily: 'membership',
        subsystem: 'organization_users',
        workflow: 'organization_reject_invitation',
        stage: 'started',
        outcome: 'success',
        organizationId: organizationId,
        targetType: 'organization_invitation',
        targetId: userId,
        change: {
          target_user_id: userId,
          decision: 'rejected',
        },
        retentionClass: 'transient_runtime',
      })
    )

    try {
      await this.invitationTransactionRunner.run(async (trx) => {
        const pendingInvitation = await this.memberships.findPending(organizationId, userId, trx)

        if (!pendingInvitation || !pendingInvitation.invited_by) {
          throw new NotFoundException('Không tìm thấy lời mời đang chờ xử lý')
        }
        const organization = await this.organizations.findById(organizationId, trx)
        if (!organization) {
          throw NotFoundException.resource('Tổ chức', organizationId)
        }

        await this.memberships.updateStatus(organizationId, userId, 'rejected', trx)

        await auditPublicApi.log(
          {
            user_id: userId,
            action: 'reject_invitation',
            entity_type: EntityType.ORGANIZATION,
            entity_id: organizationId,
            affected_user_ids: [userId],
            old_values: {
              organization_id: pendingInvitation.organization_id,
              user_id: pendingInvitation.user_id,
              status: pendingInvitation.status,
            },
            new_values: {
              status: 'rejected',
              action: 'reject',
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
              eventName: 'organization.invitation_rejected',
              businessEventId: `${organizationId}:${userId}:${occurredAt}`,
              recipientId: pendingInvitation.invited_by,
            }),
            schemaVersion: 1,
            type: BACKEND_NOTIFICATION_TYPES.ORGANIZATION_JOIN_REJECTED,
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
      })
    } catch (error) {
      await platformWorkflowLogger.checkpointSafely(
        this.execCtx,
        buildOrganizationMembershipEvent(this.execCtx, {
          eventName: 'organization_invitation_reject_failed',
          eventFamily: 'membership',
          subsystem: 'organization_users',
          workflow: 'organization_reject_invitation',
          stage: 'failed',
          outcome: 'failure',
          organizationId: organizationId,
          targetType: 'organization_invitation',
          targetId: userId,
          change: {
            target_user_id: userId,
            decision: 'rejected',
          },
          runtime: {
            duration_ms: Date.now() - startedAt,
          },
          error,
        })
      )
      throw error
    }

    await this.cacheInvalidator.invalidateMembership({
      organizationId,
      userIds: [userId],
    })

    await platformWorkflowLogger.checkpointSafely(
      this.execCtx,
      buildOrganizationMembershipEvent(this.execCtx, {
        eventName: 'organization_invitation_rejected',
        eventFamily: 'membership',
        subsystem: 'organization_users',
        workflow: 'organization_reject_invitation',
        stage: 'completed',
        outcome: 'success',
        organizationId: organizationId,
        targetType: 'organization_invitation',
        targetId: userId,
        change: {
          target_user_id: userId,
          decision: 'rejected',
        },
        runtime: {
          duration_ms: Date.now() - startedAt,
        },
      })
    )
  }
}
