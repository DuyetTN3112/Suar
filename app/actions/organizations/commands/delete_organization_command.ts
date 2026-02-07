import { type ExecutionContext } from '#types/execution_context'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import Organization from '#models/organization'
import AuditLog from '#models/audit_log'
import type { DeleteOrganizationDTO } from '../dtos/delete_organization_dto.js'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { OrganizationRole } from '#constants/organization_constants'
import { EntityType } from '#constants/audit_constants'
import CacheService from '#services/cache_service'

/**
 * Command: Delete Organization
 *
 * Pattern: Soft delete with cascading checks (learned from Tasks module)
 * Business rules:
 * - Only Owner (role_id = 1) can delete
 * - Check for active projects before deletion
 * - Support soft delete (default) or permanent delete
 * - Soft delete sets deleted_at timestamp
 *
 * @example
 * const command = new DeleteOrganizationCommand(ctx)
 * await command.execute(dto)
 */
export default class DeleteOrganizationCommand {
  constructor(protected execCtx: ExecutionContext) {}

  /**
   * Execute command: Delete organization
   *
   * Steps:
   * 1. Find organization
   * 2. Check permissions (Owner only)
   * 3. Check for active projects
   * 4. Begin transaction
   * 5. Delete organization (soft or permanent)
   * 6. Create audit log
   * 7. Commit transaction
   */
  async execute(dto: DeleteOrganizationDTO): Promise<void> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new Error('Unauthorized')
    }
    const trx = await db.transaction()

    try {
      // 1. Find organization
      const organization = await Organization.find(dto.organizationId)
      if (!organization) {
        throw new Error(`Organization with ID ${String(dto.organizationId)} not found`)
      }

      // 2. Check permissions (Owner only)
      await this.checkPermissions(organization.id, userId, trx)

      // 3. Check for active projects
      await this.checkActiveProjects(organization.id, trx)

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
        },
        { client: trx }
      )

      await trx.commit()

      // Invalidate organization caches
      await CacheService.deleteByPattern(`organization:*`)
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
      .where('role_id', OrganizationRole.OWNER)
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
