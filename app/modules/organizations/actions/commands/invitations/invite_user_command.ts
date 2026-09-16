import { InviteUserDTO } from '../../dtos/request/invitations/invite_user_dto.js'

import { stageInvitationNotification } from './invite_user_notification_stager.js'
import {
  resolveAllowedRoleIds,
  validateInvitationContext,
  type BuildInviteUserRequestOptions,
  type InviteMemberRequestInput,
} from './invite_user_validator.js'

import { AuditAction, EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import AppException from '#modules/errors/public_contracts/application_exception'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import { Result } from '#modules/errors/public_contracts/result'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
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
import type { OrganizationTransactionRunner } from '#modules/organizations/actions/ports/outbound/organization_transaction'
import { buildOrganizationMembershipEvent } from '#modules/organizations/observability/invitations/organization_event_factory'
import { OrganizationRole } from '#modules/organizations/public_contracts/access/organization_constants'


export type { InviteMemberRequestInput, BuildInviteUserRequestOptions }

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

/**
 * Command: Invite User to Organization
 *
 * Pattern: Invitation record creation (without email)
 * Business rules:
 * - Only Owner (role_id = 1) or Admin (role_id = 2) can send invites
 * - Invitation source-of-truth is organization_users with invited_by + pending status
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
    const allowedRoleIds = await resolveAllowedRoleIds(
      input.organizationId,
      options.resolveAssignableRoles ?? false,
      this.execCtx,
      this.organizations
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

  /**
   * Execute command: Invite user to organization
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

  private requireActorId(): string {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    return userId
  }

  private async persistInvitationInTransaction(
    dto: InviteUserDTO,
    userId: string
  ): Promise<{
    normalizedEmail: string
    inviteeId: string
    invitation: OrganizationMembershipRecord
  }> {
    return this.executeInTransaction(async (trx) => {
      const { normalizedEmail, inviteeId, organizationName } =
        await validateInvitationContext(
          dto,
          userId,
          this.userReaderWriter,
          this.organizations,
          this.memberships,
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

      await stageInvitationNotification(
        dto,
        userId,
        inviteeId,
        organizationName,
        occurredAt,
        this.notificationStager,
        trx
      )

      return { normalizedEmail, inviteeId, invitation }
    })
  }
}
