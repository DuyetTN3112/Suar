import { InviteUserDTO } from '../../dtos/request/invitations/invite_user_dto.js'

import { AuditAction, EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import AppException from '#modules/errors/public_contracts/application_exception'
import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { Result } from '#modules/errors/public_contracts/result'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
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
import type { OrganizationActionContext } from '#modules/organizations/actions/action_context'
import { BaseCommand } from '#modules/organizations/actions/commands/base_command'
import type { OrganizationUserReaderWriter } from '#modules/organizations/actions/ports/outbound/invitations/organization_external_dependencies'
import type { OrganizationNotificationStager } from '#modules/organizations/actions/ports/outbound/invitations/organization_notification_stager'
import type {
  OrganizationMembershipRecord,
  OrganizationMembershipRepository,
  OrganizationReader,
} from '#modules/organizations/actions/ports/outbound/invitations/organization_persistence'
import type {
  OrganizationTransaction,
  OrganizationTransactionRunner,
} from '#modules/organizations/actions/ports/outbound/organization_transaction'
import GetAssignableOrganizationRolesQuery from '#modules/organizations/actions/queries/access/get_assignable_organization_roles_query'
import { canInviteOrganizationMembers } from '#modules/organizations/domain/access/org_permission_policy'
import { buildOrganizationMembershipEvent } from '#modules/organizations/observability/invitations/organization_event_factory'
import { OrganizationRole } from '#modules/organizations/public_contracts/access/organization_constants'

type OptionalPayloadKeys<T extends object> = {
  [Key in keyof T]-?: undefined extends T[Key] ? Key : never
}[keyof T]

type OmittedUndefined<T extends object> = {
  [Key in keyof T as Key extends OptionalPayloadKeys<T> ? never : Key]: T[Key]
} & {
  [Key in OptionalPayloadKeys<T>]?: Exclude<T[Key], undefined>
}

function omitUndefined<T extends object>(value: T): OmittedUndefined<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  ) as OmittedUndefined<T>
}


export interface InviteMemberRequestInput {
  organizationId: string
  email: string
  roleId?: string
  orgRole?: string
  message?: string
}

export interface BuildInviteUserRequestOptions {
  resolveAssignableRoles?: boolean
}

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
export default class InviteUserCommand extends BaseCommand<InviteUserDTO> {
  constructor(
    execCtx: OrganizationActionContext,
    private notificationStager: OrganizationNotificationStager,
    private readonly userReaderWriter: OrganizationUserReaderWriter,
    transactionRunner: OrganizationTransactionRunner,
    private readonly organizations: OrganizationReader,
    private readonly memberships: OrganizationMembershipRepository
  ) {
    super(execCtx, transactionRunner)
  }

  async executeFromRequest(
    input: InviteMemberRequestInput,
    options: BuildInviteUserRequestOptions = {}
  ): Promise<void> {
    const roleId = input.roleId ?? input.orgRole ?? OrganizationRole.MEMBER
    const allowedRoleIds = await this.resolveAllowedRoleIds(
      input.organizationId,
      options.resolveAssignableRoles ?? false
    )
    const dto = InviteUserDTO.fromValidatedPayload(
      omitUndefined({
        organization_id: input.organizationId,
        email: input.email,
        role_id: roleId,
        allowed_role_ids: allowedRoleIds,
        message: input.message,
      })
    )
    await this.execute(dto)
  }

  async executeFromRequestAndWrap(
    input: InviteMemberRequestInput,
    options: BuildInviteUserRequestOptions = {}
  ): Promise<Result<void, AppException>> {
    try {
      await this.executeFromRequest(input, options)
      return Result.ok()
    } catch (error) {
      if (error instanceof AppException) return Result.fail(error)
      throw error
    }
  }

  private async resolveAllowedRoleIds(
    organizationId: string,
    resolveAssignableRoles: boolean
  ): Promise<string[]> {
    if (!resolveAssignableRoles) {
      return [OrganizationRole.ADMIN, OrganizationRole.MEMBER]
    }

    const { roleIds } = await new GetAssignableOrganizationRolesQuery(
      this.execCtx,
      this.organizations
    ).handle({ organizationId })

    return roleIds
  }

  /**
   * Execute command: Invite user to organization
   *
   * Steps:
   * 1. Resolve actor
   * 2. Load and validate invitation context inside a transaction
   * 3. Persist the invitation, audit, canonical notification, and outbox intents atomically
   * 4. Run observability checkpoints outside the transaction
   */
  async handle(dto: InviteUserDTO): Promise<void> {
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

  /** Compatibility entrypoint for existing application callers. */
  async execute(dto: InviteUserDTO): Promise<void> {
    return this.handle(dto)
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
    trx: OrganizationTransaction
  ): Promise<{ normalizedEmail: string; inviteeId: string; organizationName: string }> {
    await this.checkPermissions(dto.organizationId, userId, trx)

    const normalizedEmail = dto.getNormalizedEmail()
    const invitee = await this.userReaderWriter.findUserByEmail(normalizedEmail, trx)
    if (!invitee) {
      throw new NotFoundException('Không tìm thấy người dùng với email này')
    }

    const inviteeIsActive = await this.userReaderWriter.isActiveUser(invitee.id, trx)
    if (!inviteeIsActive) {
      throw new NotFoundException('Không tìm thấy người dùng với email này')
    }

    await this.checkDuplicateInvitation(dto.organizationId, invitee.id, normalizedEmail, trx)

    const organization = await this.organizations.findById(dto.organizationId, trx)
    if (!organization) {
      throw NotFoundException.resource('Tổ chức', dto.organizationId)
    }

    return {
      normalizedEmail,
      inviteeId: invitee.id,
      organizationName: organization.name,
    }
  }

  /**
   * Helper: Persist the invitation and all mandatory durable effects in one transaction.
   */
  private async persistInvitationInTransaction(
    dto: InviteUserDTO,
    userId: string
  ): Promise<{
    normalizedEmail: string
    inviteeId: string
    invitation: OrganizationMembershipRecord
  }> {
    return this.executeInTransaction(async (trx) => {
      const { normalizedEmail, inviteeId, organizationName } = await this.validateInvitationContext(
        dto,
        userId,
        trx
      )
      const invitation = await this.memberships.add(
        {
          organization_id: dto.organizationId,
          user_id: inviteeId,
          invited_by: userId,
          org_role: dto.roleId,
        },
        trx
      )

      await auditPublicApi.log(
        {
          user_id: userId,
          action: AuditAction.INVITE,
          entity_type: EntityType.ORGANIZATION,
          entity_id: dto.organizationId,
          affected_user_ids: [inviteeId],
          new_values: {
            email: normalizedEmail,
            role: dto.getRoleName(),
            invited_user_id: inviteeId,
            invited_membership_user_id: invitation.user_id,
            status: invitation.status,
          },
        },
        this.execCtx,
        { trx, critical: true }
      )

      const occurredAt = invitation.created_at.toISOString()
      if (!occurredAt) {
        throw new InvariantViolationException(
          'Persisted organization invitation is missing its creation timestamp'
        )
      }
      await this.notificationStager.stage(
        {
          eventId: buildNotificationEventId({
            eventName: 'organization.invited',
            businessEventId: `${dto.organizationId}:${inviteeId}:${occurredAt}`,
            recipientId: inviteeId,
          }),
          schemaVersion: 1,
          type: BACKEND_NOTIFICATION_TYPES.ORGANIZATION_INVITATION,
          recipientId: inviteeId,
          scope: { kind: 'organization', id: dto.organizationId },
          actor: { type: 'user', id: userId },
          subject: {
            type: BACKEND_NOTIFICATION_ENTITY_TYPES.ORGANIZATION,
            id: dto.organizationId,
          },
          parameters: {
            organizationName,
            roleName: dto.getRoleNameVi(),
          },
          occurredAt,
          correlationId: `${dto.organizationId}:${inviteeId}`,
        },
        { trx }
      )

      return { normalizedEmail, inviteeId, invitation }
    })
  }

  /**
   * Helper: Check if user has permission to send invitations.
   */
  private async checkPermissions(
    organizationId: string,
    userId: string,
    trx: OrganizationTransaction
  ): Promise<void> {
    const actorMembership = await this.memberships.getContext(organizationId, userId, trx)
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
    trx: OrganizationTransaction
  ): Promise<void> {
    const membership = await this.memberships.find(organizationId, inviteeUserId, trx)

    if (!membership) {
      return
    }

    if (membership.status === 'approved') {
      throw ConflictException.alreadyExists('Người dùng này đã là thành viên của tổ chức')
    }

    if (membership.status === 'pending' && membership.invited_by) {
      throw ConflictException.alreadyExists(
        `Lời mời cho email ${email} đã tồn tại và đang chờ xử lý`
      )
    }

    if (membership.status === 'pending') {
      throw ConflictException.alreadyExists(
        'Người dùng này đã có yêu cầu tham gia tổ chức đang chờ xử lý'
      )
    }

    throw ConflictException.alreadyExists(
      'Người dùng này đã từng bị từ chối hoặc đã tồn tại trong tổ chức'
    )
  }
}
