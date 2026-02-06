import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { UpdateOrganizationDTO } from '../dtos/request/update_organization_dto.js'

import UnauthorizedException from '#exceptions/unauthorized_exception'
import { auditPublicApi } from '#modules/audit/actions/public_api'
import { AuditAction, EntityType } from '#modules/audit/constants/audit_constants'
import { enforcePolicy } from '#modules/authorization/actions/public_api'
import CacheService from '#modules/cache/infra/cache_service'
import { canUpdateOrganization } from '#modules/organizations/domain/org_permission_policy'
import * as membershipQueries from '#modules/organizations/infra/repositories/organization_user_repository/read/membership_queries'
import OrganizationRepository from '#modules/organizations/infra/repositories/read/organization_repository'
import * as OrganizationMutations from '#modules/organizations/infra/repositories/write/organization_mutations'
import type { DatabaseId } from '#types/database'
import { type ExecutionContext } from '#types/execution_context'
import type { OrganizationRecord } from '#types/organization_records'

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
  async execute(dto: UpdateOrganizationDTO): Promise<OrganizationRecord> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException('Unauthorized')
    }
    const trx = await db.transaction()

    try {
      // 1. Find organization
      const organization = await OrganizationRepository.findActiveOrFailRecord(
        dto.organizationId,
        trx
      )

      // 2. Check permissions (Owner or Admin)
      await this.checkPermissions(organization.id, userId, trx)

      // 3. Store old values for audit
      const oldValues = { ...organization }

      // 4. Update organization with provided fields
      const updates = dto.toObject()
      const updatedOrganization = await OrganizationMutations.updateByIdRecord(
        organization.id,
        updates,
        trx
      )

      // 5. Create audit log
      await auditPublicApi.log(
        {
          user_id: userId,
          action: AuditAction.UPDATE,
          entity_type: EntityType.ORGANIZATION,
          entity_id: organization.id,
          old_values: oldValues,
          new_values: updatedOrganization,
        },
        this.execCtx
      )

      await trx.commit()

      // Emit domain event
      void emitter.emit('organization:updated', {
        organizationId: organization.id,
        updatedBy: userId,
        changes: updates,
      })

      // Invalidate organization caches
      await CacheService.deleteByPattern(`organization:*`)

      return updatedOrganization
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
    const actorMembership = await membershipQueries.getMembershipContext(
      organizationId,
      userId,
      trx
    )
    const actorOrgRole = actorMembership?.role ?? null

    enforcePolicy(canUpdateOrganization(actorOrgRole))
  }
}
