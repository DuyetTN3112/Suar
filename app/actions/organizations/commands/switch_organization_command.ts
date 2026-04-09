import { type ExecutionContext } from '#types/execution_context'
import db from '@adonisjs/lucid/services/db'
import OrganizationRepository from '#infra/organizations/repositories/organization_repository'
import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'
import UserRepository from '#infra/users/repositories/user_repository'
import CreateAuditLog from '#actions/common/create_audit_log'
import { AuditAction, EntityType } from '#constants/audit_constants'
import type { DatabaseId } from '#types/database'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import emitter from '@adonisjs/core/services/emitter'
import { enforcePolicy } from '#actions/shared/enforce_policy'
import {
  canAccessOrganizationAdminShell,
  canSwitchOrganization,
} from '#domain/organizations/org_permission_policy'
import NotFoundException from '#exceptions/not_found_exception'

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
      const actorOrgRole = await OrganizationUserRepository.getMemberRoleName(
        organizationId,
        userId,
        trx,
        true
      )
      const userModel = await UserRepository.findNotDeletedOrFail(userId, trx)

      if (!organization) {
        throw NotFoundException.resource('Tổ chức', organizationId)
      }

      enforcePolicy(canSwitchOrganization(actorOrgRole))

      // 2. Get current organization for audit log
      const currentOrganizationId = userModel.current_organization_id

      // 3. Update user's current organization
      userModel.current_organization_id = organizationId
      await UserRepository.save(userModel, trx)

      // 4. Create audit log
      await new CreateAuditLog(this.execCtx).handle({
        user_id: userId,
        action: AuditAction.SWITCH_ORGANIZATION,
        entity_type: EntityType.USER,
        entity_id: userId,
        old_values: { current_organization_id: currentOrganizationId },
        new_values: { current_organization_id: organizationId },
      })

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
        redirectPath: canAccessOrganizationAdminShell(actorOrgRole) ? '/org' : '/tasks',
      }
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }
}
