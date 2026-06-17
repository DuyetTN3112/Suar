import type { RemoveMemberDTO } from '../../dtos/request/members/remove_member_dto.js'

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
import { canRemoveMember } from '#modules/organizations/domain/access/org_permission_policy'
import type { OrganizationActionContext } from '#modules/organizations/actions/action_context'
import { BaseCommand } from '#modules/organizations/actions/commands/base_command'
import type { OrganizationEventPublisher } from '#modules/organizations/actions/ports/outbound/members/organization_event_publisher'
import type { OrganizationMemberProjectOffboarding } from '#modules/organizations/actions/ports/outbound/members/organization_member_project_offboarding'
import type { OrganizationNotificationStager } from '#modules/organizations/actions/ports/outbound/members/organization_notification_stager'
import type { OrganizationMembershipRepository } from '#modules/organizations/actions/ports/outbound/members/organization_persistence'
import type {
  OrganizationTransaction,
  OrganizationTransactionRunner,
} from '#modules/organizations/actions/ports/outbound/organization_transaction'
import { buildOrganizationMembershipEvent } from '#modules/organizations/observability/organization_event_factory'

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
 * Command: Remove Member from Organization
 *
 * Cascading actions with task reassignment.
 *
 * Pattern: FETCH → DECIDE → PERSIST
 */
export default class RemoveMemberCommand extends BaseCommand<RemoveMemberDTO> {
  constructor(
    execCtx: OrganizationActionContext,
    private notificationStager: OrganizationNotificationStager,
    private readonly projectOffboarding: OrganizationMemberProjectOffboarding,
    transactionRunner: OrganizationTransactionRunner,
    private readonly memberships: OrganizationMembershipRepository,
    private readonly organizationEventPublisher: OrganizationEventPublisher
  ) {
    super(execCtx, transactionRunner)
  }

  async handle(dto: RemoveMemberDTO): Promise<void> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }
    const startedAt = Date.now()
    platformOperationalLogger.log(
      'info',
      buildOrganizationMembershipEvent(this.execCtx, {
        eventName: PLATFORM_EVENT_NAMES.ORGANIZATION_MEMBER_REMOVAL_STARTED,
        eventFamily: 'membership',
        subsystem: 'organization_membership',
        workflow: 'organization_remove_member',
        stage: 'started',
        outcome: 'success',
        organizationId: dto.organizationId,
        targetType: 'organization_membership',
        targetId: dto.userId,
        change: {
          target_user_id: dto.userId,
          reason: dto.getNormalizedReason(),
        },
        retentionClass: 'transient_runtime',
      })
    )
    try {
      await this.executeInTransaction(async (trx) => {
        const actorMembership = await this.memberships.getContext(dto.organizationId, userId, trx)
        const actorOrgRole = actorMembership?.role ?? null
        const targetMembership = await this.memberships.find(dto.organizationId, dto.userId, trx)

        if (!targetMembership) {
          throw new NotFoundException('Người dùng không phải thành viên của tổ chức này')
        }

        enforcePolicy(
          canRemoveMember({
            actorId: userId,
            actorOrgRole: actorOrgRole,
            targetUserId: dto.userId,
            targetOrgRole: targetMembership.org_role,
          })
        )

        await this.projectOffboarding.offboardMember(dto.organizationId, dto.userId, trx)
        await this.memberships.delete(dto.organizationId, dto.userId, trx)

        await auditPublicApi.log(
          {
            user_id: userId,
            action: 'remove_member',
            entity_type: EntityType.ORGANIZATION,
            entity_id: dto.organizationId,
            affected_user_ids: [dto.userId],
            old_values: {
              organization_id: targetMembership.organization_id,
              user_id: targetMembership.user_id,
              org_role: targetMembership.org_role,
              status: targetMembership.status,
              invited_by: targetMembership.invited_by,
              created_at: targetMembership.created_at.toISOString(),
              updated_at: targetMembership.updated_at.toISOString(),
            },
            new_values: {
              removed_user_id: dto.userId,
              removed_user_role: targetMembership.org_role,
              reason: dto.getNormalizedReason(),
            },
          },
          this.execCtx,
          { trx, critical: true }
        )

        const membershipCreatedAt = targetMembership.created_at.toISOString()
        if (!membershipCreatedAt) {
          throw new InvariantViolationException(
            'Organization membership is missing its creation timestamp'
          )
        }
        await this.stageMemberRemovedNotification(
          dto,
          userId,
          membershipCreatedAt,
          new Date().toISOString(),
          trx
        )
      })
    } catch (error) {
      await platformWorkflowLogger.checkpointSafely(
        this.execCtx,
        buildOrganizationMembershipEvent(this.execCtx, {
          eventName: PLATFORM_EVENT_NAMES.ORGANIZATION_MEMBER_REMOVAL_FAILED,
          eventFamily: 'membership',
          subsystem: 'organization_membership',
          workflow: 'organization_remove_member',
          stage: 'failed',
          outcome: 'failure',
          organizationId: dto.organizationId,
          targetType: 'organization_membership',
          targetId: dto.userId,
          change: {
            target_user_id: dto.userId,
            reason: dto.getNormalizedReason(),
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
      'organization.member.removed',
      () =>
        this.organizationEventPublisher.publishOrganizationMemberRemoved({
          organizationId: dto.organizationId,
          userId: dto.userId,
          removedBy: userId,
        }),
      {
        organizationId: dto.organizationId,
        actorId: userId,
      }
    )
    await platformWorkflowLogger.checkpointSafely(
      this.execCtx,
      buildOrganizationMembershipEvent(this.execCtx, {
        eventName: PLATFORM_EVENT_NAMES.ORGANIZATION_MEMBER_REMOVAL_COMPLETED,
        eventFamily: 'membership',
        subsystem: 'organization_membership',
        workflow: 'organization_remove_member',
        stage: 'completed',
        outcome: 'success',
        organizationId: dto.organizationId,
        targetType: 'organization_membership',
        targetId: dto.userId,
        change: {
          target_user_id: dto.userId,
          reason: dto.getNormalizedReason(),
        },
        runtime: {
          duration_ms: Date.now() - startedAt,
        },
      })
    )
  }

  /** Compatibility entrypoint for existing application callers. */
  async execute(dto: RemoveMemberDTO): Promise<void> {
    return this.handle(dto)
  }

  private async stageMemberRemovedNotification(
    dto: RemoveMemberDTO,
    actorId: string,
    membershipCreatedAt: string,
    occurredAt: string,
    trx: OrganizationTransaction
  ): Promise<void> {
    await this.notificationStager.stage(
      {
        eventId: buildNotificationEventId({
          eventName: 'organization.member_removed',
          businessEventId: `${dto.organizationId}:${dto.userId}:${membershipCreatedAt}`,
          recipientId: dto.userId,
        }),
        type: BACKEND_NOTIFICATION_TYPES.MEMBER_REMOVED,
        schemaVersion: 1,
        recipientId: dto.userId,
        scope: { kind: 'organization', id: dto.organizationId },
        actor: { type: 'user', id: actorId },
        subject: {
          type: BACKEND_NOTIFICATION_ENTITY_TYPES.ORGANIZATION,
          id: dto.organizationId,
        },
        parameters: {
          reason: dto.getNormalizedReason(),
        },
        occurredAt,
        correlationId: `${dto.organizationId}:${dto.userId}`,
      },
      { trx }
    )
  }
}
