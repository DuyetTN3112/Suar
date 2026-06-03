import { UpdateMemberRoleDTO } from '../../dtos/request/members/update_member_role_dto.js'

import { AuditAction, EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import { PolicyResult as PR } from '#modules/authorization/public_contracts/policy_result'
import AppException from '#modules/errors/public_contracts/application_exception'
import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { Result } from '#modules/errors/public_contracts/result'
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
import GetAssignableOrganizationRolesQuery from '#modules/organizations/actions/queries/access/get_assignable_organization_roles_query'
import { canChangeRole } from '#modules/organizations/domain/access/org_permission_policy'
import { OrganizationRole } from '#modules/organizations/public_contracts/access/organization_constants'
import type { OrganizationActionContext } from '#modules/organizations/actions/action_context'
import { BaseCommand } from '#modules/organizations/actions/commands/base_command'
import type { OrganizationEventPublisher } from '#modules/organizations/actions/ports/outbound/members/organization_event_publisher'
import type { OrganizationNotificationStager } from '#modules/organizations/actions/ports/outbound/members/organization_notification_stager'
import type {
  OrganizationMembershipRepository,
  OrganizationReader,
} from '#modules/organizations/actions/ports/outbound/members/organization_persistence'
import type {
  OrganizationTransaction,
  OrganizationTransactionRunner,
} from '#modules/organizations/actions/ports/outbound/organization_transaction'
import { buildOrganizationMembershipEvent } from '#modules/organizations/observability/organization_event_factory'

export interface UpdateMemberRoleRequestInput {
  organizationId: string
  userId: string
  roleId?: string
  orgRole?: string
}

export interface BuildMemberRequestOptions {
  resolveAssignableRoles?: boolean
}

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
 * Command: Update Member Role
 *
 * Pattern: Complex permission validation (learned from Projects module)
 * Business rules:
 * - Owner can update any role (except Owner)
 * - Admin can only update roles >= 2 (Admin, Manager, Member, Viewer)
 * - Cannot change Owner's role
 * - Cannot promote to Owner (use transfer ownership instead)
 * - Send notification on role change
 *
 * @example
 * const command = new UpdateMemberRoleCommand(ctx, createNotification)
 * await command.execute(dto)
 */
export default class UpdateMemberRoleCommand extends BaseCommand<UpdateMemberRoleDTO> {
  constructor(
    execCtx: OrganizationActionContext,
    private notificationStager: OrganizationNotificationStager,
    transactionRunner: OrganizationTransactionRunner,
    private readonly organizations: OrganizationReader,
    private readonly memberships: OrganizationMembershipRepository,
    private readonly organizationEventPublisher: OrganizationEventPublisher
  ) {
    super(execCtx, transactionRunner)
  }

  async executeFromRequest(
    input: UpdateMemberRoleRequestInput,
    options: BuildMemberRequestOptions = {}
  ): Promise<void> {
    const roleId = input.roleId ?? input.orgRole ?? OrganizationRole.MEMBER
    const allowedRoleIds = await this.resolveAllowedRoleIds(
      input.organizationId,
      options.resolveAssignableRoles ?? false
    )
    const dto = UpdateMemberRoleDTO.fromValidatedPayload({
      organization_id: input.organizationId,
      user_id: input.userId,
      role_id: roleId,
      allowed_role_ids: allowedRoleIds,
    })
    await this.execute(dto)
  }

  async executeFromRequestAndWrap(
    input: UpdateMemberRoleRequestInput,
    options: BuildMemberRequestOptions = {}
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
   * Execute command: Update member's role
   *
   * Steps:
   * 1. Resolve actor
   * 2. Fetch current membership data
   * 3. Validate the role change
   * 4. Persist the change inside a transaction
   * 5. Commit
   * 6. Run post-commit side effects
   */
  async handle(dto: UpdateMemberRoleDTO): Promise<void> {
    const actorId = this.requireActorId()
    const startedAt = Date.now()
    platformOperationalLogger.log(
      'info',
      buildOrganizationMembershipEvent(this.execCtx, {
        eventName: PLATFORM_EVENT_NAMES.ORGANIZATION_MEMBER_ROLE_CHANGE_STARTED,
        eventFamily: 'membership',
        subsystem: 'organization_membership',
        workflow: 'organization_update_member_role',
        stage: 'started',
        outcome: 'success',
        organizationId: dto.organizationId,
        targetType: 'organization_membership',
        targetId: dto.userId,
        change: {
          target_user_id: dto.userId,
          new_role: dto.newRoleId,
        },
        retentionClass: 'transient_runtime',
      })
    )

    try {
      const roleChange = await this.persistRoleChangeInTransaction(dto, actorId)
      await this.runPostCommitSideEffects(dto, actorId, roleChange.oldRole)
      await platformWorkflowLogger.checkpointSafely(
        this.execCtx,
        buildOrganizationMembershipEvent(this.execCtx, {
          eventName: PLATFORM_EVENT_NAMES.ORGANIZATION_MEMBER_ROLE_CHANGE_COMPLETED,
          eventFamily: 'membership',
          subsystem: 'organization_membership',
          workflow: 'organization_update_member_role',
          stage: 'completed',
          outcome: 'success',
          organizationId: dto.organizationId,
          targetType: 'organization_membership',
          targetId: dto.userId,
          change: {
            target_user_id: dto.userId,
            old_role: roleChange.oldRole,
            new_role: dto.newRoleId,
            action_type: dto.getActionType(roleChange.oldRole),
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
          eventName: PLATFORM_EVENT_NAMES.ORGANIZATION_MEMBER_ROLE_CHANGE_FAILED,
          eventFamily: 'membership',
          subsystem: 'organization_membership',
          workflow: 'organization_update_member_role',
          stage: 'failed',
          outcome: 'failure',
          organizationId: dto.organizationId,
          targetType: 'organization_membership',
          targetId: dto.userId,
          change: {
            target_user_id: dto.userId,
            new_role: dto.newRoleId,
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
  async execute(dto: UpdateMemberRoleDTO): Promise<void> {
    return this.handle(dto)
  }

  private async persistRoleChangeInTransaction(
    dto: UpdateMemberRoleDTO,
    actorId: string
  ): Promise<{ oldRole: string }> {
    return this.executeInTransaction(async (trx) => {
      const context = await this.fetchRoleChangeContext(dto, actorId, trx)
      this.validateRoleChange(dto, actorId, context)
      const occurredAt = await this.persistRoleChange(dto, actorId, context.targetCurrentRole, trx)
      await this.stageRoleChangedNotification(
        dto,
        actorId,
        context.targetCurrentRole,
        occurredAt,
        trx
      )

      return { oldRole: context.targetCurrentRole }
    })
  }

  /**
   * Helper: Require an authenticated actor.
   */
  private requireActorId(): string {
    const actorId = this.execCtx.userId
    if (!actorId) {
      throw new UnauthorizedException()
    }

    return actorId
  }

  /**
   * Helper: Fetch actor and target role state before mutating anything.
   */
  private async fetchRoleChangeContext(
    dto: UpdateMemberRoleDTO,
    actorId: string,
    trx: OrganizationTransaction
  ): Promise<{ actorOrgRole: string; targetCurrentRole: string }> {
    const actorMembership = await this.memberships.getContext(dto.organizationId, actorId, trx)
    const targetMembership = await this.memberships.getContext(
      dto.organizationId,
      dto.userId,
      trx,
      false
    )
    const actorOrgRole = actorMembership?.role ?? null
    const targetCurrentRole = targetMembership?.role ?? null

    enforcePolicy(actorOrgRole ? PR.allow() : PR.deny('Bạn không phải thành viên của tổ chức này'))

    if (!targetCurrentRole) {
      throw new NotFoundException('Người dùng đích không phải thành viên của tổ chức này')
    }

    return { actorOrgRole: actorOrgRole as string, targetCurrentRole }
  }

  /**
   * Helper: Validate the requested role change.
   */
  private validateRoleChange(
    dto: UpdateMemberRoleDTO,
    actorId: string,
    context: { actorOrgRole: string; targetCurrentRole: string }
  ): void {
    enforcePolicy(
      canChangeRole({
        actorOrgRole: context.actorOrgRole,
        targetCurrentRole: context.targetCurrentRole,
        targetNewRole: dto.newRoleId,
        isSelfUpdate: dto.userId === actorId,
      })
    )

    if (context.targetCurrentRole === dto.newRoleId) {
      throw ConflictException.alreadyExists('Người dùng đã có vai trò này')
    }
  }

  /**
   * Helper: Persist the role change and audit record inside the transaction.
   */
  private async persistRoleChange(
    dto: UpdateMemberRoleDTO,
    actorId: string,
    oldRole: string,
    trx: OrganizationTransaction
  ): Promise<string> {
    await this.memberships.updateRole(dto.organizationId, dto.userId, dto.newRoleId, trx)

    await auditPublicApi.log(
      {
        user_id: actorId,
        action: AuditAction.UPDATE_MEMBER_ROLE,
        entity_type: EntityType.ORGANIZATION,
        entity_id: dto.organizationId,
        affected_user_ids: [dto.userId],
        old_values: { user_id: dto.userId, org_role: oldRole },
        new_values: { user_id: dto.userId, org_role: dto.newRoleId },
      },
      this.execCtx,
      { trx, critical: true }
    )

    const membership = await this.memberships.find(dto.organizationId, dto.userId, trx)
    const occurredAt = membership?.updated_at.toISOString()
    if (!occurredAt) {
      throw new InvariantViolationException(
        'Updated organization membership is missing its transition timestamp'
      )
    }
    return occurredAt
  }

  /**
   * Helper: Run post-commit side effects after the transaction is safely committed.
   */
  private async runPostCommitSideEffects(
    dto: UpdateMemberRoleDTO,
    actorId: string,
    oldRole: string
  ): Promise<void> {
    await settlePostCommitEffect(
      'organization.member.role_changed',
      () =>
        this.organizationEventPublisher.publishOrganizationMemberRoleChanged({
          organizationId: dto.organizationId,
          userId: dto.userId,
          oldRole,
          newRole: dto.newRoleId,
          changedBy: actorId,
        }),
      {
        organizationId: dto.organizationId,
        actorId,
      }
    )
  }

  private async stageRoleChangedNotification(
    dto: UpdateMemberRoleDTO,
    actorId: string,
    oldRole: string,
    occurredAt: string,
    trx: OrganizationTransaction
  ): Promise<void> {
    await this.notificationStager.stage(
      {
        eventId: buildNotificationEventId({
          eventName: 'organization.member_role_changed',
          businessEventId: `${dto.organizationId}:${dto.userId}:${occurredAt}`,
          recipientId: dto.userId,
        }),
        type: BACKEND_NOTIFICATION_TYPES.ROLE_CHANGED,
        schemaVersion: 1,
        recipientId: dto.userId,
        scope: { kind: 'organization', id: dto.organizationId },
        actor: { type: 'user', id: actorId },
        subject: {
          type: BACKEND_NOTIFICATION_ENTITY_TYPES.ORGANIZATION,
          id: dto.organizationId,
        },
        parameters: {
          oldRole,
          newRole: dto.newRoleId,
          roleName: dto.getRoleNameVi(),
          actionType: dto.getActionType(oldRole),
        },
        occurredAt,
        correlationId: `${dto.organizationId}:${dto.userId}`,
      },
      { trx }
    )
  }
}
