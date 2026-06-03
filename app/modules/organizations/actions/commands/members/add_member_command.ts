import type { AddMemberDTO } from '../../dtos/request/members/add_member_dto.js'

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
import { canAddMember } from '#modules/organizations/domain/access/org_permission_policy'
import { OrganizationUserStatus } from '#modules/organizations/public_contracts/access/organization_constants'
import type { OrganizationActionContext } from '#modules/organizations/actions/action_context'
import type { OrganizationEventPublisher } from '#modules/organizations/actions/ports/outbound/members/organization_event_publisher'
import type { OrganizationUserReaderWriter } from '#modules/organizations/actions/ports/outbound/members/organization_external_dependencies'
import type { OrganizationNotificationStager } from '#modules/organizations/actions/ports/outbound/members/organization_notification_stager'
import type { OrganizationMembershipRepository } from '#modules/organizations/actions/ports/outbound/members/organization_persistence'
import type { OrganizationTransactionRunner } from '#modules/organizations/actions/ports/outbound/organization_transaction'

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
 * Command: Add Member to Organization
 *
 * Pattern: Permission check with notification (learned from Projects module)
 * Business rules:
 * - Only Owner (role_id = 1) or Admin (role_id = 2) can add members
 * - Cannot add member as Owner (role_id = 1)
 * - Check for duplicate membership
 * - Send notification to added member
 *
 * @example
 * const command = new AddMemberCommand(ctx, createNotification)
 * await command.execute(dto)
 */
export default class AddMemberCommand {
  constructor(
    protected execCtx: OrganizationActionContext,
    private notificationStager: OrganizationNotificationStager,
    private readonly userReaderWriter: OrganizationUserReaderWriter,
    private readonly transactionRunner: OrganizationTransactionRunner,
    private readonly memberships: OrganizationMembershipRepository,
    private readonly organizationEventPublisher: OrganizationEventPublisher
  ) {}

  /**
   * Execute command: Add member to organization
   *
   * Steps:
   * 1. Validate user exists
   * 2. Check permissions (Owner or Admin)
   * 3. Check for duplicate membership
   * 4. Begin transaction
   * 5. Add member to organization_users
   * 6. Create audit log
   * 7. Commit transaction
   * 8. Send notification (outside transaction)
   */
  async execute(dto: AddMemberDTO): Promise<void> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException('Unauthorized')
    }
    await this.transactionRunner.run(async (trx) => {
      // 1. Validate user exists
      const userToAdd = await this.userReaderWriter.findUserIdentity(dto.userId, trx)
      if (!userToAdd) {
        throw NotFoundException.user(dto.userId)
      }

      // 2. Check permissions, role validity, and duplicate membership
      const actorMembership = await this.memberships.getContext(dto.organizationId, userId, trx)
      const actorOrgRole = actorMembership?.role ?? null
      const alreadyMember = await this.memberships.isMember(dto.userId, dto.organizationId, trx)
      enforcePolicy(
        canAddMember({
          actorOrgRole,
          targetRoleId: dto.roleId,
          isAlreadyMember: alreadyMember,
        })
      )

      // 5. Add member to organization → delegate to Model
      const membership = await this.memberships.add(
        {
          organization_id: dto.organizationId,
          user_id: dto.userId,
          org_role: dto.roleId,
          status: OrganizationUserStatus.APPROVED,
          invited_by: userId,
        },
        trx
      )

      // 6. Create audit log
      await auditPublicApi.log(
        {
          user_id: userId,
          action: 'add_member',
          entity_type: EntityType.ORGANIZATION,
          entity_id: dto.organizationId,
          affected_user_ids: [dto.userId],
          new_values: {
            ...dto.toObject(),
            added_user_id: dto.userId,
            role: dto.getRoleName(),
            org_role: dto.roleId,
          },
        },
        this.execCtx,
        { trx, critical: true }
      )

      const occurredAt = membership.created_at.toISOString()
      if (!occurredAt) {
        throw new InvariantViolationException(
          'Persisted organization membership is missing its creation timestamp'
        )
      }
      await this.notificationStager.stage(
        {
          eventId: buildNotificationEventId({
            eventName: 'organization.member_added',
            businessEventId: `${dto.organizationId}:${dto.userId}:${occurredAt}`,
            recipientId: dto.userId,
          }),
          type: BACKEND_NOTIFICATION_TYPES.MEMBER_ADDED,
          schemaVersion: 1,
          recipientId: dto.userId,
          scope: { kind: 'organization', id: dto.organizationId },
          actor: { type: 'user', id: userId },
          subject: {
            type: BACKEND_NOTIFICATION_ENTITY_TYPES.ORGANIZATION,
            id: dto.organizationId,
          },
          parameters: {
            roleName: dto.getRoleNameVi(),
          },
          occurredAt,
          correlationId: `${dto.organizationId}:${dto.userId}`,
        },
        { trx }
      )
    })

    await settlePostCommitEffect(
      'organization.member.added',
      () =>
        this.organizationEventPublisher.publishOrganizationMemberAdded({
          organizationId: dto.organizationId,
          userId: dto.userId,
          org_role: dto.roleId,
          invitedBy: userId,
        }),
      {
        organizationId: dto.organizationId,
        actorId: userId,
      }
    )
  }
}
