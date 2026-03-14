import UnauthorizedException from '#exceptions/unauthorized_exception'
import NotFoundException from '#exceptions/not_found_exception'
import { type ExecutionContext } from '#types/execution_context'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import Organization from '#models/organization'
import OrganizationUserRepository from '#repositories/organization_user_repository'
import OrganizationRepository from '#repositories/organization_repository'
import AuditLog from '#models/mongo/audit_log'
import type { DeleteOrganizationDTO } from '../dtos/delete_organization_dto.js'
import { EntityType } from '#constants/audit_constants'
import CacheService from '#services/cache_service'
import emitter from '@adonisjs/core/services/emitter'
import { enforcePolicy } from '#domain/shared/enforce_policy'
import { canDeleteOrganization } from '#domain/organizations/org_permission_policy'

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
      const organization = await Organization.find(dto.organizationId)
      if (!organization) {
        throw NotFoundException.resource('Tổ chức', dto.organizationId)
      }

      const [orgRole, activeProjectCount] = await Promise.all([
        OrganizationUserRepository.getMemberRoleName(organization.id, userId, trx, false),
        OrganizationRepository.countActiveProjects(organization.id, trx),
      ])

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
        await organization.useTransaction(trx).delete()
      } else {
        organization.deleted_at = DateTime.now()
        await organization.useTransaction(trx).save()
      }

      await AuditLog.create({
        user_id: userId,
        action: dto.isPermanentDelete() ? 'permanent_delete' : 'soft_delete',
        entity_type: EntityType.ORGANIZATION,
        entity_id: organization.id,
        old_values: oldValues,
        new_values: {
          deletion_type: dto.getDeletionType(),
          reason: dto.getNormalizedReason(),
        },
        ip_address: this.execCtx.ip,
        user_agent: this.execCtx.userAgent,
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
