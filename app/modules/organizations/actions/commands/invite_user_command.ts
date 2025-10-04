import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import {
  buildInviteUserDTO,
  type BuildMemberRequestOptions,
  type InviteMemberRequestInput,
} from '../builders/member_request_dto_builders.js'
import type { InviteUserDTO } from '../dtos/request/invite_user_dto.js'
import { DefaultOrganizationDependencies } from '../ports/organization_external_dependencies_impl.js'

import { AuditAction, EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import ConflictException from '#modules/http/exceptions/conflict_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
} from '#modules/notifications/public_contracts/notification_constants'
import { notificationPublicApi } from '#modules/notifications/public_contracts/notification_creator'
import type { NotificationCreator } from '#modules/notifications/public_contracts/notification_creator'
import { PLATFORM_EVENT_NAMES } from '#modules/observability/contracts/platform_event_names'
import {
  platformOperationalLogger,
  platformWorkflowLogger,
} from '#modules/observability/public_contracts/platform_observability'
import type { OrganizationActionContext } from '#modules/organizations/actions/organization_action_context'
import { canInviteOrganizationMembers } from '#modules/organizations/domain/org_permission_policy'
import * as membershipQueries from '#modules/organizations/infra/repositories/organization_user_repository/read/membership_queries'
import OrgAccessRepository from '#modules/organizations/infra/repositories/read/org_access_repository'
import OrganizationRepository from '#modules/organizations/infra/repositories/read/organization_repository'
import { buildOrganizationMembershipEvent } from '#modules/organizations/observability/organization_event_factory'
import { OrganizationUserStatus } from '#modules/organizations/public_contracts/organization_constants'

/**
 * Command: Invite User to Organization
 *
 * Pattern: Invitation record creation (without email)
 * Business rules:
 * - Only Owner (role_id = 1) or Admin (role_id = 2) can send invites
 * - Invitation source-of-truth is organization_users with invited_by + pending status
 *
 * @example
 * const command = new InviteUserCommand(ctx)
 * await command.execute(dto)
 */
export default class InviteUserCommand {
  constructor(
    protected execCtx: OrganizationActionContext,
    private createNotification: NotificationCreator = notificationPublicApi
  ) {}

  async executeFromRequest(
    input: InviteMemberRequestInput,
    options: BuildMemberRequestOptions = {}
  ): Promise<void> {
    const dto = await buildInviteUserDTO(this.execCtx, input, options)
    await this.execute(dto)
  }

  /**
   * Execute command: Invite user to organization
   *
   * Steps:
   * 1. Resolve actor
   * 2. Load and validate invitation context inside a transaction
   * 3. Persist the invitation and commit
   * 4. Run post-commit side effects outside the transaction
   */
  async execute(dto: InviteUserDTO): Promise<void> {
    const userId = this.requireActorId()
    const startedAt = Date.now()

    platformOperationalLogger.log(
      'info',
      buildOrganizationMembershipEvent(this.execCtx, {
        eventName: PLATFORM_EVENT_NAMES.ORGANIZATION_INVITATION_STARTED,
        eventFamily: 'membership',
        subsystem: 'organization_membership',
        workflow: 'organization_invite_user',
        stage: 'started',
        outcome: 'success',
        organizationId: dto.organizationId,
        targetType: 'organization_invitation',
        targetId: dto.getNormalizedEmail(),
        change: {
          invited_email: dto.getNormalizedEmail(),
          invited_role: dto.roleId,
        },
        retentionClass: 'transient_runtime',
      })
    )

    try {
      const invitationContext = await this.persistInvitationInTransaction(dto, userId)
      await this.runPostCommitSideEffects(dto, userId, invitationContext)
      await platformWorkflowLogger.checkpointSafely(
        this.execCtx,
        buildOrganizationMembershipEvent(this.execCtx, {
          eventName: PLATFORM_EVENT_NAMES.ORGANIZATION_INVITATION_COMPLETED,
          eventFamily: 'membership',
          subsystem: 'organization_membership',
          workflow: 'organization_invite_user',
          stage: 'completed',
          outcome: 'success',
          organizationId: dto.organizationId,
          targetType: 'organization_invitation',
          targetId: invitationContext.invitation.user_id,
          change: {
            invited_email: invitationContext.normalizedEmail,
            invited_role: dto.roleId,
            invited_user_id: invitationContext.inviteeId,
            status: invitationContext.invitation.status,
          },
          runtime: {
            duration_ms: Date.now() - startedAt,
          },
        })
      )
    } catch (error) {
      await platformWorkflowLogger.checkpointSafely(
        this.execCtx,
        buildOrganizationMembershipEvent(this.execCtx, {
          eventName: PLATFORM_EVENT_NAMES.ORGANIZATION_INVITATION_FAILED,
          eventFamily: 'membership',
          subsystem: 'organization_membership',
          workflow: 'organization_invite_user',
          stage: 'failed',
          outcome: 'failure',
          organizationId: dto.organizationId,
          targetType: 'organization_invitation',
          targetId: dto.getNormalizedEmail(),
          change: {
            invited_email: dto.getNormalizedEmail(),
            invited_role: dto.roleId,
          },
          runtime: {
            duration_ms: Date.now() - startedAt,
          },
          error,
        })
      )
      throw error
    }
  }

  /**
   * Helper: Require an authenticated actor.
   */
  private requireActorId(): string {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    return userId
  }

  /**
   * Helper: Validate invitation prerequisites inside the transaction.
   */
  private async validateInvitationContext(
    dto: InviteUserDTO,
    userId: string,
    trx: TransactionClientContract
  ): Promise<{ normalizedEmail: string; inviteeId: string }> {
    await this.checkPermissions(dto.organizationId, userId, trx)

    const normalizedEmail = dto.getNormalizedEmail()
    const invitee = await DefaultOrganizationDependencies.user.findUserByEmail(normalizedEmail, trx)
    if (!invitee) {
      throw new NotFoundException('Không tìm thấy người dùng với email này')
    }

    const inviteeIsActive = await DefaultOrganizationDependencies.user.isActiveUser(invitee.id, trx)
    if (!inviteeIsActive) {
      throw new NotFoundException('Không tìm thấy người dùng với email này')
    }

    await this.checkDuplicateInvitation(dto.organizationId, invitee.id, normalizedEmail, trx)

    const organization = await OrganizationRepository.findById(dto.organizationId, trx)
    if (!organization) {
      throw NotFoundException.resource('Tổ chức', dto.organizationId)
    }

    return { normalizedEmail, inviteeId: invitee.id }
  }

  /**
   * Helper: Persist the invitation inside a transaction and commit before side effects.
   */
  private async persistInvitationInTransaction(
    dto: InviteUserDTO,
    userId: string
  ): Promise<{
    normalizedEmail: string
    inviteeId: string
    invitation: Awaited<ReturnType<typeof OrgAccessRepository.createInvitation>>
  }> {
    const trx = await db.transaction()

    try {
      const { normalizedEmail, inviteeId } = await this.validateInvitationContext(dto, userId, trx)
      const invitation = await OrgAccessRepository.createInvitation(
        {
          organization_id: dto.organizationId,
          email: normalizedEmail,
          invited_by: userId,
          org_role: dto.roleId,
        },
        trx
      )

      await trx.commit()

      return { normalizedEmail, inviteeId, invitation }
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  /**
   * Helper: Run post-commit side effects after the transaction is safely committed.
   */
  private async runPostCommitSideEffects(
    dto: InviteUserDTO,
    userId: string,
    invitationContext: {
      normalizedEmail: string
      inviteeId: string
      invitation: Awaited<ReturnType<typeof OrgAccessRepository.createInvitation>>
    }
  ): Promise<void> {
    await auditPublicApi.log(
      {
        user_id: userId,
        action: AuditAction.INVITE,
        entity_type: EntityType.ORGANIZATION,
        entity_id: dto.organizationId,
        new_values: {
          email: invitationContext.normalizedEmail,
          role: dto.getRoleName(),
          invited_user_id: invitationContext.inviteeId,
          invited_membership_user_id: invitationContext.invitation.user_id,
          status: invitationContext.invitation.status,
        },
      },
      this.execCtx
    )

    void emitter.emit('audit:log', {
      userId,
      action: 'invite_user',
      entityType: 'organization',
      entityId: dto.organizationId,
      newValues: {
        email: invitationContext.normalizedEmail,
        role: dto.getRoleName(),
      },
    })

    const organization = await OrganizationRepository.findById(dto.organizationId)
    const orgName = organization?.name ?? 'Tổ chức'

    try {
      await this.createNotification.handle({
        user_id: invitationContext.inviteeId,
        title: 'Lời mời tham gia tổ chức',
        message: `Bạn đã nhận được lời mời tham gia tổ chức ${orgName}`,
        type: BACKEND_NOTIFICATION_TYPES.ORGANIZATION_INVITATION,
        related_entity_type: BACKEND_NOTIFICATION_ENTITY_TYPES.ORGANIZATION,
        related_entity_id: dto.organizationId,
      })
    } catch (error) {
      platformOperationalLogger.log(
        'warn',
        buildOrganizationMembershipEvent(this.execCtx, {
          eventName: 'organization.invite.notification_failed',
          eventFamily: 'membership',
          subsystem: 'organization_membership',
          workflow: 'organization_invite_user',
          stage: 'notification_failed',
          outcome: 'warning',
          organizationId: dto.organizationId,
          targetType: 'organization_invitation',
          targetId: invitationContext.inviteeId,
          change: {
            invited_email: invitationContext.normalizedEmail,
          },
          error,
          retentionClass: 'transient_runtime',
        })
      )
    }
  }

  /**
   * Helper: Check if user has permission to send invitations.
   */
  private async checkPermissions(
    organizationId: string,
    userId: string,
    trx: TransactionClientContract
  ): Promise<void> {
    const actorMembership = await membershipQueries.getMembershipContext(
      organizationId,
      userId,
      trx
    )
    const actorOrgRole = actorMembership?.role ?? null
    enforcePolicy(canInviteOrganizationMembers(actorOrgRole))
  }

  /**
   * Helper: Check for duplicate active invitations.
   */
  private async checkDuplicateInvitation(
    organizationId: string,
    inviteeUserId: string,
    email: string,
    trx: TransactionClientContract
  ): Promise<void> {
    const membership = await membershipQueries.findMembership(
      organizationId,
      inviteeUserId,
      trx
    )

    if (!membership) {
      return
    }

    if (membership.status === OrganizationUserStatus.APPROVED) {
      throw ConflictException.alreadyExists('Người dùng này đã là thành viên của tổ chức')
    }

    if (membership.status === OrganizationUserStatus.PENDING && membership.invited_by) {
      throw ConflictException.alreadyExists(
        `Lời mời cho email ${email} đã tồn tại và đang chờ xử lý`
      )
    }

    if (membership.status === OrganizationUserStatus.PENDING) {
      throw ConflictException.alreadyExists(
        'Người dùng này đã có yêu cầu tham gia tổ chức đang chờ xử lý'
      )
    }

    throw ConflictException.alreadyExists(
      'Người dùng này đã từng bị từ chối hoặc đã tồn tại trong tổ chức'
    )
  }
}
