import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'

import type { DeleteOrganizationDTO } from '../dtos/request/delete_organization_dto.js'

import { auditPublicApi } from '#actions/audit/public_api'
import { enforcePolicy } from '#actions/authorization/public_api'
import { projectPublicApi } from '#actions/projects/public_api'
import { EntityType } from '#constants/audit_constants'
import { canDeleteOrganization } from '#domain/organizations/org_permission_policy'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import CacheService from '#infra/cache/cache_service'
import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'
import OrganizationRepository from '#infra/organizations/repositories/read/organization_repository'
import * as OrganizationMutations from '#infra/organizations/repositories/write/organization_mutations'
import { type ExecutionContext } from '#types/execution_context'

/**
 * Command: Delete Organization
 *
 * Soft delete (default) or permanent delete.
 *
 * Pattern: FETCH → DECIDE → PERSIST
 */
export default class DeleteOrganizationCommand {
  constructor(protected execCtx: ExecutionContext) {}

  async execute(dto: DeleteOrganizationDTO): Promise<void> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }
    const trx = await db.transaction()

    try {
      // ── FETCH ──────────────────────────────────────────────────────────
      const organization = await OrganizationRepository.findActiveOrFailRecord(
        dto.organizationId,
        trx
      )

      const actorMembership = await OrganizationUserRepository.getMembershipContext(
        organization.id,
        userId,
        trx
      )
      const orgRole = actorMembership?.role ?? null
      const activeProjectCount = await projectPublicApi.countActiveByOrganization(
        organization.id,
        trx
      )

      // ── DECIDE (pure, sync) ────────────────────────────────────────────
      enforcePolicy(
        canDeleteOrganization({
          actorId: userId,
          actorOrgRole: orgRole,
          activeProjectCount,
        })
      )

      // ── PERSIST ────────────────────────────────────────────────────────
      const oldValues = { ...organization }

      const deletedOrganization = dto.isPermanentDelete()
        ? await OrganizationMutations.hardDeleteByIdRecord(organization.id, trx)
        : await OrganizationMutations.softDeleteByIdRecord(organization.id, trx)

      await auditPublicApi.log(
        {
          user_id: userId,
          action: dto.isPermanentDelete() ? 'permanent_delete' : 'soft_delete',
          entity_type: EntityType.ORGANIZATION,
          entity_id: organization.id,
          old_values: oldValues,
          new_values: {
            deleted_at: deletedOrganization.deleted_at,
            deletion_type: dto.getDeletionType(),
            reason: dto.getNormalizedReason(),
          },
        },
        this.execCtx
      )

      await trx.commit()

      // Emit domain event
      void emitter.emit('organization:deleted', {
        organizationId: organization.id,
        deletedBy: userId,
      })

      // Invalidate organization caches
      await CacheService.deleteByPattern(`organization:*`)
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }
}
