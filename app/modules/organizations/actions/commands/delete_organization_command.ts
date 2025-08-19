import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'

import type { DeleteOrganizationDTO } from '../dtos/request/delete_organization_dto.js'

import { EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import type { OrganizationActionContext } from '#modules/organizations/actions/organization_action_context'
import { canDeleteOrganization } from '#modules/organizations/domain/org_permission_policy'
import * as membershipQueries from '#modules/organizations/infra/repositories/organization_user_repository/read/membership_queries'
import OrganizationRepository from '#modules/organizations/infra/repositories/read/organization_repository'
import * as OrganizationMutations from '#modules/organizations/infra/repositories/write/organization_mutations'
import { projectPublicApi } from '#modules/projects/public_contracts/project_public_api'

/**
 * Command: Delete Organization
 *
 * Soft delete (default) or permanent delete.
 *
 * Pattern: FETCH → DECIDE → PERSIST
 */
export default class DeleteOrganizationCommand {
  constructor(protected execCtx: OrganizationActionContext) {}

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

      const actorMembership = await membershipQueries.getMembershipContext(
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
      await cacheStore.deleteByPattern(`organization:*`)
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }
}
