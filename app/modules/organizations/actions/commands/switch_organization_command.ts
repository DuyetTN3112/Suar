import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'

import { DefaultOrganizationDependencies } from '../ports/organization_external_dependencies_impl.js'

import { AuditAction, EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import type { OrganizationActionContext } from '#modules/organizations/actions/organization_action_context'
import {
  canAccessOrganizationAdminShell,
  canSwitchOrganization,
} from '#modules/organizations/domain/org_permission_policy'
import * as membershipQueries from '#modules/organizations/infra/repositories/organization_user_repository/read/membership_queries'
import OrganizationRepository from '#modules/organizations/infra/repositories/read/organization_repository'

/**
 * Command: Switch Organization
 *
 * Pattern: Simple state update (learned from all modules)
 * Business rules:
 * - User must be a member of target organization
 * - Update current_organization_id in users table
 * - This affects which organization's data user sees by default
 *
 * @example
 * const command = new SwitchOrganizationCommand(ctx)
 * await command.execute(organizationId)
 */
export default class SwitchOrganizationCommand {
  constructor(protected execCtx: OrganizationActionContext) {}

  /**
   * Execute command: Switch user's current organization
   *
   * Steps:
   * 1. Validate user is member of target organization
   * 2. Begin transaction
   * 3. Update user's current_organization_id
   * 4. Create audit log
   * 5. Commit transaction
   */
  async execute(organizationId: string): Promise<{
    organization: { id: string; name: string }
    redirectPath: string
  }> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException('Unauthorized')
    }
    const trx = await db.transaction()

    try {
      const organization = await OrganizationRepository.findBasicInfo(organizationId, trx)
      const membershipContext = await membershipQueries.getMembershipContext(
        organizationId,
        userId,
        trx,
        true
      )
      const actorOrgRole = membershipContext?.role ?? null
      const user = await DefaultOrganizationDependencies.user.findUserIdentity(userId, trx)

      if (!organization) {
        throw NotFoundException.resource('Tổ chức', organizationId)
      }

      if (!user) {
        throw NotFoundException.resource('Người dùng', userId)
      }

      const isActiveUser = await DefaultOrganizationDependencies.user.isActiveUser(userId, trx)
      if (!isActiveUser) {
        throw new ForbiddenException('Suspended users cannot switch organization')
      }

      enforcePolicy(canSwitchOrganization(actorOrgRole))

      // 2. Get current organization for audit log
      const currentOrganizationId = user.current_organization_id

      // 3. Update user's current organization
      await DefaultOrganizationDependencies.user.updateCurrentOrganization(
        userId,
        organizationId,
        trx
      )

      // 4. Create audit log
      await auditPublicApi.log(
        {
          user_id: userId,
          action: AuditAction.SWITCH_ORGANIZATION,
          entity_type: EntityType.USER,
          entity_id: userId,
          old_values: { current_organization_id: currentOrganizationId },
          new_values: { current_organization_id: organizationId },
        },
        this.execCtx
      )

      await trx.commit()

      // Emit cache invalidation for user permissions
      void emitter.emit('cache:invalidate', {
        entityType: 'user',
        entityId: userId,
        patterns: [`user:${userId}:*`],
      })

      return {
        organization: {
          id: organization.id,
          name: organization.name,
        },
        redirectPath: canAccessOrganizationAdminShell(actorOrgRole).allowed ? '/org' : '/tasks',
      }
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }
}
