import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import {
  buildUpdateMemberRoleDTO,
  type BuildMemberRequestOptions,
  type UpdateMemberRoleRequestInput,
} from '../builders/member_request_dto_builders.js'
import type { UpdateMemberRoleDTO } from '../dtos/request/update_member_role_dto.js'

import { AuditAction, EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import { PolicyResult as PR } from '#modules/authorization/public_contracts/policy_result'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import ConflictException from '#modules/http/exceptions/conflict_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import loggerService from '#modules/logger/public_contracts/logger_service'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
} from '#modules/notifications/public_contracts/notification_constants'
import type { NotificationCreator } from '#modules/notifications/public_contracts/notification_creator'
import type { OrganizationActionContext } from '#modules/organizations/actions/organization_action_context'
import { canChangeRole } from '#modules/organizations/domain/org_permission_policy'
import * as membershipQueries from '#modules/organizations/infra/repositories/organization_user_repository/read/membership_queries'
import * as membershipMutations from '#modules/organizations/infra/repositories/organization_user_repository/write/mutation_queries'

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
export default class UpdateMemberRoleCommand {
  constructor(
    protected execCtx: OrganizationActionContext,
    private createNotification: NotificationCreator
  ) {}

  async executeFromRequest(
    input: UpdateMemberRoleRequestInput,
    options: BuildMemberRequestOptions = {}
  ): Promise<void> {
    const dto = await buildUpdateMemberRoleDTO(this.execCtx, input, options)
    await this.execute(dto)
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
  async execute(dto: UpdateMemberRoleDTO): Promise<void> {
    const actorId = this.requireActorId()
    const roleChange = await this.persistRoleChangeInTransaction(dto, actorId)
    await this.runPostCommitSideEffects(dto, actorId, roleChange.oldRole)
  }

  private async persistRoleChangeInTransaction(
    dto: UpdateMemberRoleDTO,
    actorId: string
  ): Promise<{ oldRole: string }> {
    const trx = await db.transaction()

    try {
      const context = await this.fetchRoleChangeContext(dto, actorId, trx)
      this.validateRoleChange(dto, actorId, context)
      await this.persistRoleChange(dto, actorId, context.targetCurrentRole, trx)
      await trx.commit()

      return { oldRole: context.targetCurrentRole }
    } catch (error) {
      await trx.rollback()
      throw error
    }
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
    trx: TransactionClientContract
  ): Promise<{ actorOrgRole: string; targetCurrentRole: string }> {
    const actorMembership = await membershipQueries.getMembershipContext(
      dto.organizationId,
      actorId,
      trx
    )
    const targetMembership = await membershipQueries.getMembershipContext(
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
    trx: TransactionClientContract
  ): Promise<void> {
    await membershipMutations.updateRole(dto.organizationId, dto.userId, dto.newRoleId, trx)

    await auditPublicApi.log(
      {
        user_id: actorId,
        action: AuditAction.UPDATE_MEMBER_ROLE,
        entity_type: EntityType.ORGANIZATION,
        entity_id: dto.organizationId,
        old_values: { user_id: dto.userId, org_role: oldRole },
        new_values: { user_id: dto.userId, org_role: dto.newRoleId },
      },
      this.execCtx
    )
  }

  /**
   * Helper: Run post-commit side effects after the transaction is safely committed.
   */
  private async runPostCommitSideEffects(
    dto: UpdateMemberRoleDTO,
    actorId: string,
    oldRole: string
  ): Promise<void> {
    void emitter.emit('organization:member:role_changed', {
      organizationId: dto.organizationId,
      userId: dto.userId,
      oldRole,
      newRole: dto.newRoleId,
      changedBy: actorId,
    })

    await cacheStore.deleteByPattern(`organization:members:*`)
    await this.sendRoleChangedNotification(dto, oldRole)
  }

  /**
   * Helper: Send notification about role change.
   */
  private async sendRoleChangedNotification(
    dto: UpdateMemberRoleDTO,
    oldRole: string
  ): Promise<void> {
    try {
      const actionType = dto.getActionType(oldRole)
      const actionVerb = actionType === 'promotion' ? 'được thăng chức' : 'được chuyển vai trò'

      await this.createNotification.handle({
        user_id: dto.userId,
        title: 'Vai trò đã thay đổi',
        message: `Bạn ${actionVerb} thành ${dto.getRoleNameVi()} trong tổ chức`,
        type: BACKEND_NOTIFICATION_TYPES.ROLE_CHANGED,
        related_entity_type: BACKEND_NOTIFICATION_ENTITY_TYPES.ORGANIZATION,
        related_entity_id: dto.organizationId,
      })
    } catch (error) {
      loggerService.error('[UpdateMemberRoleCommand] Failed to send notification:', error)
    }
  }
}
