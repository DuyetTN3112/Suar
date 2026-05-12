import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import {
  buildUpdateMemberRoleDTO,
  type BuildMemberRequestOptions,
  type UpdateMemberRoleRequestInput,
} from '../builders/member_request_dto_builders.js'
import type { UpdateMemberRoleDTO } from '../dtos/request/update_member_role_dto.js'

import { auditPublicApi } from '#actions/audit/public_api'
import { enforcePolicy } from '#actions/authorization/public_api'
import type { NotificationCreator } from '#actions/notifications/public_api'
import { AuditAction, EntityType } from '#constants/audit_constants'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
} from '#constants/notification_constants'
import { canChangeRole } from '#domain/organizations/org_permission_policy'
import { PolicyResult as PR } from '#domain/policies/policy_result'
import ConflictException from '#exceptions/conflict_exception'
import NotFoundException from '#exceptions/not_found_exception'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import CacheService from '#infra/cache/cache_service'
import loggerService from '#infra/logger/logger_service'
import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'
import type { DatabaseId } from '#types/database'
import { type ExecutionContext } from '#types/execution_context'

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
    protected execCtx: ExecutionContext,
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
    actorId: DatabaseId
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
  private requireActorId(): DatabaseId {
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
    actorId: DatabaseId,
    trx: TransactionClientContract
  ): Promise<{ actorOrgRole: string; targetCurrentRole: string }> {
    const actorMembership = await OrganizationUserRepository.getMembershipContext(
      dto.organizationId,
      actorId,
      trx
    )
    const targetMembership = await OrganizationUserRepository.getMembershipContext(
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
    actorId: DatabaseId,
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
    actorId: DatabaseId,
    oldRole: string,
    trx: TransactionClientContract
  ): Promise<void> {
    await OrganizationUserRepository.updateRole(dto.organizationId, dto.userId, dto.newRoleId, trx)

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
    actorId: DatabaseId,
    oldRole: string
  ): Promise<void> {
    void emitter.emit('organization:member:role_changed', {
      organizationId: dto.organizationId,
      userId: dto.userId,
      oldRole,
      newRole: dto.newRoleId,
      changedBy: actorId,
    })

    await CacheService.deleteByPattern(`organization:members:*`)
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
