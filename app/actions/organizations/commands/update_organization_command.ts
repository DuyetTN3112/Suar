import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { UpdateOrganizationDTO } from '../dtos/request/update_organization_dto.js'

import CreateAuditLog from '#actions/audit/create_audit_log'
import { enforcePolicy } from '#actions/authorization/enforce_policy'
import { AuditAction, EntityType } from '#constants/audit_constants'
import { canUpdateOrganization } from '#domain/organizations/org_permission_policy'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import CacheService from '#infra/cache/cache_service'
import OrganizationRepository from '#infra/organizations/repositories/organization_repository'
import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'
import type { DatabaseId } from '#types/database'
import { type ExecutionContext } from '#types/execution_context'

/**
 * Command: Update Organization
 *
 * Pattern: Partial update with permission check (learned from Projects module)
 * Business rules:
 * - Only Owner (role_id = 1) or Admin (role_id = 2) can update
 * - Track old values for audit log
 * - Only update provided fields
 *
 * @example
 * const command = new UpdateOrganizationCommand(ctx)
 * const org = await command.execute(dto)
 */
export default class UpdateOrganizationCommand {
  constructor(protected execCtx: ExecutionContext) {}

  /**
   * Execute command: Update organization
   *
   * Steps:
   * 1. Find organization
   * 2. Check permissions (Owner or Admin)
   * 3. Begin transaction
   * 4. Store old values for audit
   * 5. Update organization
   * 6. Create audit log
   * 7. Commit transaction
   */
  async execute(dto: UpdateOrganizationDTO): Promise<import('#models/organization').default> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException('Unauthorized')
    }
    const trx = await db.transaction()

    try {
      // 1. Find organization
      const organization = await OrganizationRepository.findActiveOrFail(dto.organizationId, trx)

      // 2. Check permissions (Owner or Admin)
      await this.checkPermissions(organization.id, userId, trx)

      // 3. Store old values for audit
      const oldValues = organization.toJSON()

      // 4. Update organization with provided fields
      const updates = dto.toObject()
      organization.merge(updates)
      await OrganizationRepository.save(organization, trx)

      // 5. Create audit log
      await new CreateAuditLog(this.execCtx).handle({
        user_id: userId,
        action: AuditAction.UPDATE,
        entity_type: EntityType.ORGANIZATION,
        entity_id: organization.id,
        old_values: oldValues,
        new_values: organization.toJSON(),
      })

      await trx.commit()

      // Emit domain event
      void emitter.emit('organization:updated', {
        organization,
        updatedBy: userId,
        changes: updates,
      })

      // Invalidate organization caches
      await CacheService.deleteByPattern(`organization:*`)

      return organization
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  /**
   * Helper: Check if user has permission to update organization
   * Only Owner (role_id = 1) or Admin (role_id = 2) can update
   */
  private async checkPermissions(
    organizationId: DatabaseId,
    userId: DatabaseId,
    trx: TransactionClientContract
  ): Promise<void> {
    const actorMembership = await OrganizationUserRepository.getMembershipContext(
      organizationId,
      userId,
      trx
    )
    const actorOrgRole = actorMembership?.role ?? null

    enforcePolicy(canUpdateOrganization(actorOrgRole))
  }
}
