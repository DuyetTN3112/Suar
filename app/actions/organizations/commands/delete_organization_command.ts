import UnauthorizedException from '#exceptions/unauthorized_exception'
import NotFoundException from '#exceptions/not_found_exception'
import { type ExecutionContext } from '#types/execution_context'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'
import OrganizationRepository from '#infra/organizations/repositories/organization_repository'
import CreateAuditLog from '#actions/common/create_audit_log'
import type { DeleteOrganizationDTO } from '../dtos/request/delete_organization_dto.js'
import { EntityType } from '#constants/audit_constants'
import CacheService from '#services/cache_service'
import emitter from '@adonisjs/core/services/emitter'
import { enforcePolicy } from '#actions/shared/enforce_policy'
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
      const organization = await OrganizationRepository.findById(dto.organizationId, trx)
      if (!organization || organization.deleted_at) {
        throw NotFoundException.resource('Tổ chức', dto.organizationId)
      }

      const [orgRole, activeProjectCount] = await Promise.all([
        OrganizationUserRepository.getMemberRoleName(organization.id, userId, trx),
        OrganizationRepository.countActiveProjects(organization.id, trx),
      ])


      // 4. Store old values for audit
      const oldValues = organization.toJSON()

      // 5. Delete organization (soft or permanent)
      if (dto.isPermanentDelete()) {
        // Permanent delete - remove from database
        await organization.useTransaction(trx).delete()
      } else {
        // Soft delete - set deleted_at timestamp
        organization.deleted_at = DateTime.now()
        await organization.useTransaction(trx).save()
      }

      // 6. Create audit log
      await AuditLog.create(
        {
          user_id: user.id,
          action: dto.isPermanentDelete() ? 'permanent_delete' : 'soft_delete',
          entity_type: 'organization',
          entity_id: organization.id,
          old_values: oldValues,
          new_values: {
            deletion_type: dto.getDeletionType(),
            reason: dto.getNormalizedReason(),
          },
          ip_address: this.ctx.request.ip(),
          user_agent: this.ctx.request.header('user-agent') || '',
        },
        { client: trx }
      )

      await trx.commit()
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  /**
   * Helper: Check if user has permission to delete organization
   * Only Owner (role_id = 1) can delete
   */
  private async checkPermissions(
    organizationId: number,
    userId: number,
    trx: TransactionClientContract
  ): Promise<void> {
    const membership: unknown = await trx
      .from('organization_users')
      .where('organization_id', organizationId)
      .where('user_id', userId)
      .where('role_id', 1) // Owner only
      .first()

    if (!membership) {
      throw new Error('Only the organization owner can delete the organization')
    }
  }

  /**
   * Helper: Check for active projects
   * Cannot delete organization with active projects
   */
  private async checkActiveProjects(
    organizationId: number,
    trx: TransactionClientContract
  ): Promise<void> {
    interface CountResult {
      total: number | string
    }
    const activeProjectsCount = (await trx
      .from('projects')
      .where('organization_id', organizationId)
      .whereNull('deleted_at')
      .count('* as total')
      .first()) as CountResult | null

    const total = Number(activeProjectsCount?.total ?? 0)
    if (total > 0) {
      throw new Error(
        `Cannot delete organization with ${String(total)} active project(s). Please delete or archive all projects first.`
      )
    }
  }
}
