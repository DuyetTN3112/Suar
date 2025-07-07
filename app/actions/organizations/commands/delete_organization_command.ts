import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

import type { DeleteOrganizationDTO } from '../dtos/request/delete_organization_dto.js'

import CreateAuditLog from '#actions/common/create_audit_log'
import { enforcePolicy } from '#actions/shared/enforce_policy'
import { EntityType } from '#constants/audit_constants'
import { canDeleteOrganization } from '#domain/organizations/org_permission_policy'
import NotFoundException from '#exceptions/not_found_exception'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import CacheService from '#infra/cache/cache_service'
import OrganizationRepository from '#infra/organizations/repositories/organization_repository'
import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'
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
      const organization = await OrganizationRepository.findById(dto.organizationId, trx)
      if (!organization || organization.deleted_at) {
        throw NotFoundException.resource('Tổ chức', dto.organizationId)
      }

      const orgRole = await OrganizationUserRepository.getMemberRoleName(
        organization.id,
        userId,
        trx
      )
      const activeProjectCount = await OrganizationRepository.countActiveProjects(
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
      const oldValues = organization.toJSON()

      if (dto.isPermanentDelete()) {
        await OrganizationRepository.hardDelete(organization, trx)
      } else {
        organization.deleted_at = DateTime.now()
        await OrganizationRepository.save(organization, trx)
      }

      await new CreateAuditLog(this.execCtx).handle({
        user_id: userId,
        action: dto.isPermanentDelete() ? 'permanent_delete' : 'soft_delete',
        entity_type: EntityType.ORGANIZATION,
        entity_id: organization.id,
        old_values: oldValues,
        new_values: {
          deletion_type: dto.getDeletionType(),
          reason: dto.getNormalizedReason(),
        },
      })

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
