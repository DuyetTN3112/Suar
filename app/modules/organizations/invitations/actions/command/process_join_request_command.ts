import type { ProcessJoinRequestDTO } from '../dtos/request/process_join_request_dto.js'

import { EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import loggerService from '#modules/logger/public_contracts/application_logger'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
} from '#modules/notifications/public_contracts/notification_constants'
import { buildNotificationEventId } from '#modules/notifications/public_contracts/notification_event_identity'
import { PLATFORM_EVENT_NAMES } from '#modules/observability/public_contracts/platform_event_names'
import {
  platformOperationalLogger,
  platformWorkflowLogger,
} from '#modules/observability/public_contracts/platform_observability'
import { canProcessJoinRequest } from '#modules/organizations/access/domain/org_permission_policy'
import { OrganizationRole } from '#modules/organizations/access/public_contracts/organization_constants'
import type { OrganizationCacheInvalidator } from '#modules/organizations/directory/actions/ports/outbound/organization_cache_invalidator'
import type { OrganizationActionContext } from '#modules/organizations/invitations/actions/action_context'
import type { OrganizationEventPublisher } from '#modules/organizations/invitations/actions/ports/outbound/organization_event_publisher'
import type { OrganizationNotificationStager } from '#modules/organizations/invitations/actions/ports/outbound/organization_notification_stager'
import type { OrganizationMembershipRepository } from '#modules/organizations/invitations/actions/ports/outbound/organization_persistence'
import type {
  OrganizationTransaction,
  OrganizationTransactionRunner,
} from '#modules/organizations/invitations/actions/ports/outbound/organization_transaction'
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

/**
 * Command: Process Join Request (Approve or Reject)
 *
 * Uses organization_users with status='pending'. Approving updates status to 'approved';
 * rejecting updates it to 'rejected'.
 *
 * Business rules:
 * - Only Owner or Admin can process requests
 * - If approved, update membership status to 'approved'
 * - If rejected, update membership status to 'rejected'
 * - Send notification to requester
 */
export default class ProcessJoinRequestCommand {
  constructor(
    protected execCtx: OrganizationActionContext,
    private notificationStager: OrganizationNotificationStager,
    private readonly transactionRunner: OrganizationTransactionRunner,
    private readonly memberships: OrganizationMembershipRepository,
    private readonly organizationEventPublisher: OrganizationEventPublisher,
    private readonly cacheInvalidator: OrganizationCacheInvalidator
  ) {}

  async execute(dto: ProcessJoinRequestDTO): Promise<void> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }
    const startedAt = Date.now()
    platformOperationalLogger.log(
      'info',
      buildOrganizationMembershipEvent(this.execCtx, {
        eventName: PLATFORM_EVENT_NAMES.ORGANIZATION_JOIN_REQUEST_PROCESSED,
        eventFamily: 'membership',
        subsystem: 'organization_join_requests',
        workflow: 'organization_process_join_request',
        stage: 'started',
        outcome: 'success',
        organizationId: dto.organizationId,
        targetType: 'organization_join_request',
        targetId: dto.targetUserId,
        change: {
          target_user_id: dto.targetUserId,
          decision: dto.getStatus(),
        },
        retentionClass: 'transient_runtime',
      })
    )
    try {
      await this.transactionRunner.run(async (trx) => {
        const pendingMembership = await this.memberships.findPending(
          dto.organizationId,
          dto.targetUserId,
          trx
        )

        if (!pendingMembership) {
          throw new NotFoundException('Không tìm thấy yêu cầu tham gia đang chờ xử lý')
        }

        const actorMembership = await this.memberships.getContext(dto.organizationId, userId, trx)
        const actorOrgRole = actorMembership?.role ?? null
        enforcePolicy(
          canProcessJoinRequest({
            actorOrgRole,
            requestStatus: pendingMembership.status,
            isTargetAlreadyMember: false,
          })
        )

        const newStatus = dto.isApproval() ? 'approved' : 'rejected'
        await this.memberships.updateStatus(dto.organizationId, dto.targetUserId, newStatus, trx)

        await auditPublicApi.log(
          {
            user_id: userId,
            action: `${dto.getStatus()}_join_request`,
            entity_type: EntityType.ORGANIZATION,
            entity_id: dto.organizationId,
            affected_user_ids: [dto.targetUserId],
            old_values: {
              organization_id: pendingMembership.organization_id,
              user_id: pendingMembership.user_id,
              status: pendingMembership.status,
            },
            new_values: {
              status: newStatus,
              requester_id: dto.targetUserId,
              action: dto.getActionVerb(),
              reason: dto.getNormalizedReason(),
            },
          },
          this.execCtx,
          { trx, critical: true }
        )

        const updatedMembership = await this.memberships.find(
          dto.organizationId,
          dto.targetUserId,
          trx
        )
        const occurredAt = updatedMembership?.updated_at.toISOString()
        if (!occurredAt) {
          throw new InvariantViolationException(
            'Processed join request is missing its decision timestamp'
          )
        }
        await this.stageProcessedNotification(dto, userId, occurredAt, trx)
      })
    } catch (error) {
      await platformWorkflowLogger.checkpointSafely(
        this.execCtx,
        buildOrganizationMembershipEvent(this.execCtx, {
          eventName: PLATFORM_EVENT_NAMES.ORGANIZATION_JOIN_REQUEST_FAILED,
          eventFamily: 'membership',
          subsystem: 'organization_join_requests',
          workflow: 'organization_process_join_request',
          stage: 'failed',
          outcome: 'failure',
          organizationId: dto.organizationId,
          targetType: 'organization_join_request',
          targetId: dto.targetUserId,
          change: {
            target_user_id: dto.targetUserId,
            decision: dto.getStatus(),
          },
          runtime: {
            duration_ms: Date.now() - startedAt,
          },
          error,
        })
      )
      throw error
    }

    if (dto.isApproval()) {
      await settlePostCommitEffect(
        'organization.join_request.approved',
        () =>
          this.organizationEventPublisher.publishOrganizationMemberAdded({
            organizationId: dto.organizationId,
            userId: dto.targetUserId,
            org_role: OrganizationRole.MEMBER,
            invitedBy: null,
          }),
        {
          organizationId: dto.organizationId,
          actorId: userId,
        }
      )
    } else {
      await settlePostCommitEffect(
        'organization.join_request.rejected.cache_invalidation',
        () =>
          this.cacheInvalidator.invalidateMembership({
            organizationId: dto.organizationId,
            userIds: [dto.targetUserId],
          }),
        {
          organizationId: dto.organizationId,
          actorId: userId,
        }
      )
    }
    await platformWorkflowLogger.checkpointSafely(
      this.execCtx,
      buildOrganizationMembershipEvent(this.execCtx, {
        eventName: PLATFORM_EVENT_NAMES.ORGANIZATION_JOIN_REQUEST_PROCESSED,
        eventFamily: 'membership',
        subsystem: 'organization_join_requests',
        workflow: 'organization_process_join_request',
        stage: 'completed',
        outcome: 'success',
        organizationId: dto.organizationId,
        targetType: 'organization_join_request',
        targetId: dto.targetUserId,
        change: {
          target_user_id: dto.targetUserId,
          decision: dto.getStatus(),
          reason: dto.getNormalizedReason(),
        },
        runtime: {
          duration_ms: Date.now() - startedAt,
        },
      })
    )
  }

  private async stageProcessedNotification(
    dto: ProcessJoinRequestDTO,
    actorId: string,
    occurredAt: string,
    trx: OrganizationTransaction
  ): Promise<void> {
    const decision = dto.isApproval() ? 'approved' : 'rejected'
    await this.notificationStager.stage(
      {
        eventId: buildNotificationEventId({
          eventName: `organization.join_request_${decision}`,
          businessEventId: `${dto.organizationId}:${dto.targetUserId}:${occurredAt}`,
          recipientId: dto.targetUserId,
        }),
        type: dto.isApproval()
          ? BACKEND_NOTIFICATION_TYPES.JOIN_REQUEST_APPROVED
          : BACKEND_NOTIFICATION_TYPES.JOIN_REQUEST_REJECTED,
        schemaVersion: 1,
        recipientId: dto.targetUserId,
        scope: { kind: 'organization', id: dto.organizationId },
        actor: { type: 'user', id: actorId },
        subject: {
          type: BACKEND_NOTIFICATION_ENTITY_TYPES.ORGANIZATION,
          id: dto.organizationId,
        },
        parameters: {
          decision,
          reason: dto.getNormalizedReason(),
        },
        occurredAt,
        correlationId: `${dto.organizationId}:${dto.targetUserId}`,
      },
      { trx }
    )
  }
}
