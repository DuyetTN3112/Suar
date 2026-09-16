import { UpdateMemberRoleDTO } from '../../dtos/request/members/update_member_role_dto.js'

import {
  settlePostCommitEffect,
  stageRoleChangedNotification,
} from './update_member_role_notification_stager.js'
import {
  fetchRoleChangeContext,
  resolveAllowedRoleIds,
  validateRoleChange,
  type BuildMemberRequestOptions,
  type UpdateMemberRoleRequestInput,
} from './update_member_role_validator.js'

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
import { OrganizationRole } from '#modules/organizations/public_contracts/access/organization_constants'


export type { UpdateMemberRoleRequestInput, BuildMemberRequestOptions }

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
    const allowedRoleIds = await resolveAllowedRoleIds(
      input.organizationId,
      options.resolveAssignableRoles ?? false,
      this.execCtx,
      this.organizations
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

  /**
   * Execute command: Update member's role
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
      const context = await fetchRoleChangeContext(dto, actorId, this.memberships, trx)
      validateRoleChange(dto, actorId, context)
      const occurredAt = await this.persistRoleChange(dto, actorId, context.targetCurrentRole, trx)
      await stageRoleChangedNotification(
        dto,
        actorId,
        context.targetCurrentRole,
        occurredAt,
        this.notificationStager,
        trx
      )

      return { oldRole: context.targetCurrentRole }
    })
  }

  private requireActorId(): string {
    const actorId = this.execCtx.userId
    if (!actorId) {
      throw new UnauthorizedException()
    }

    return actorId
  }

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
}
