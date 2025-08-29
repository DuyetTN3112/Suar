import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'

import type { AddMemberDTO } from '../dtos/request/add_member_dto.js'
import { DefaultOrganizationDependencies } from '../ports/organization_external_dependencies_impl.js'

import { EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import loggerService from '#modules/logger/public_contracts/logger_service'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
} from '#modules/notifications/public_contracts/notification_constants'
import type { NotificationCreator } from '#modules/notifications/public_contracts/notification_creator'
import type { OrganizationActionContext } from '#modules/organizations/actions/organization_action_context'
import { canAddMember } from '#modules/organizations/domain/org_permission_policy'
import * as membershipQueries from '#modules/organizations/infra/repositories/organization_user_repository/read/membership_queries'
import * as membershipMutations from '#modules/organizations/infra/repositories/organization_user_repository/write/mutation_queries'

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
    private createNotification: NotificationCreator
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
    const trx = await db.transaction()

    try {
      // 1. Validate user exists
      const userToAdd = await DefaultOrganizationDependencies.user.findUserIdentity(dto.userId, trx)
      if (!userToAdd) {
        throw new BusinessLogicException(`User with ID ${dto.userId} not found`)
      }

      // 2. Check permissions, role validity, and duplicate membership
      const actorMembership = await membershipQueries.getMembershipContext(
        dto.organizationId,
        userId,
        trx
      )
      const actorOrgRole = actorMembership?.role ?? null
      const alreadyMember = await membershipQueries.isMember(
        dto.userId,
        dto.organizationId,
        trx
      )
      enforcePolicy(
        canAddMember({
          actorOrgRole,
          targetRoleId: dto.roleId,
          isAlreadyMember: alreadyMember,
        })
      )

      // 5. Add member to organization → delegate to Model
      await membershipMutations.addMember(
        {
          organization_id: dto.organizationId,
          user_id: dto.userId,
          org_role: dto.roleId,
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
          new_values: {
            ...dto.toObject(),
            added_user_id: dto.userId,
            role: dto.getRoleName(),
            org_role: dto.roleId,
          },
        },
        this.execCtx
      )

      await trx.commit()

      // Emit domain event
      void emitter.emit('organization:member:added', {
        organizationId: dto.organizationId,
        userId: dto.userId,
        org_role: dto.roleId,
        invitedBy: userId,
      })

      // Invalidate organization member caches
      await cacheStore.deleteByPattern(`organization:members:*`)
      await cacheStore.deleteByPattern(`organization:metadata:*`)

      // 7. Send notification (outside transaction)
      await this.sendMemberAddedNotification(dto, userId)
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  /**
   * Helper: Send notification to added member
   */
  private async sendMemberAddedNotification(
    dto: AddMemberDTO,
    _addedByUserId: string
  ): Promise<void> {
    try {
      await this.createNotification.handle({
        user_id: dto.userId,
        title: 'Được thêm vào tổ chức',
        message: `Bạn đã được thêm vào tổ chức với vai trò ${dto.getRoleNameVi()}`,
        type: BACKEND_NOTIFICATION_TYPES.MEMBER_ADDED,
        related_entity_type: BACKEND_NOTIFICATION_ENTITY_TYPES.ORGANIZATION,
        related_entity_id: dto.organizationId,
      })
    } catch (error) {
      loggerService.error('[AddMemberCommand] Failed to send notification:', error)
    }
  }
}
