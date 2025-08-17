import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'

import { DefaultOrganizationDependencies } from '../ports/organization_external_dependencies_impl.js'

import { auditPublicApi } from '#actions/audit/public_api'
import { enforcePolicy } from '#actions/authorization/public_api'
import { AuditAction, EntityType } from '#constants/audit_constants'
import {
  canAccessOrganizationAdminShell,
  canSwitchOrganization,
} from '#domain/organizations/org_permission_policy'
import NotFoundException from '#exceptions/not_found_exception'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'
import OrganizationRepository from '#infra/organizations/repositories/read/organization_repository'
import type { DatabaseId } from '#types/database'
import { type ExecutionContext } from '#types/execution_context'

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
  constructor(protected execCtx: ExecutionContext) {}

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
  async execute(organizationId: DatabaseId): Promise<{
    organization: { id: DatabaseId; name: string }
    redirectPath: string
  }> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException('Unauthorized')
    }
    const trx = await db.transaction()

    try {
      const organization = await OrganizationRepository.findBasicInfo(organizationId, trx)
      const membershipContext = await OrganizationUserRepository.getMembershipContext(
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
