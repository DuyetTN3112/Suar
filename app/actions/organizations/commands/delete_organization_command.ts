import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import Organization from '#models/organization'
import AuditLog from '#models/audit_log'
import type { DeleteOrganizationDTO } from '../dtos/delete_organization_dto.js'

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
  constructor(protected ctx: HttpContext) {}

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
    const user = this.ctx.auth.user!
    const trx = await db.transaction()

    try {
      // 1. Find organization
      const organization = await Organization.find(dto.organizationId)
      if (!organization) {
        throw new Error(`Organization with ID ${dto.organizationId} not found`)
      }

      // 2. Check permissions (Owner only)
      await this.checkPermissions(organization.id, user.id, trx)

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
          user_id: user.id,
          action: dto.isPermanentDelete() ? 'permanent_delete' : 'soft_delete',
          entity_type: 'organization',
          entity_id: organization.id,
          old_values: oldValues,
          metadata: JSON.stringify({
            deletion_type: dto.getDeletionType(),
            reason: dto.getNormalizedReason(),
          }),
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
  private async checkPermissions(organizationId: number, userId: number, trx: any): Promise<void> {
    const membership = await db
      .from('organization_users')
      .where('organization_id', organizationId)
      .where('user_id', userId)
      .where('role_id', 1) // Owner only
      .useTransaction(trx)
      .first()

    if (!membership) {
      throw new Error('Only the organization owner can delete the organization')
    }
  }

  /**
   * Helper: Check for active projects
   * Cannot delete organization with active projects
   */
  private async checkActiveProjects(organizationId: number, trx: any): Promise<void> {
    const activeProjectsCount = await db
      .from('projects')
      .where('organization_id', organizationId)
      .whereNull('deleted_at')
      .useTransaction(trx)
      .count('* as total')
      .first()

    const total = Number(activeProjectsCount?.total || 0)
    if (total > 0) {
      throw new Error(
        `Cannot delete organization with ${total} active project(s). Please delete or archive all projects first.`
      )
    }
  }
}
