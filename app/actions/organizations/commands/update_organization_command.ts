import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import Organization from '#models/organization'
import AuditLog from '#models/audit_log'
import type { UpdateOrganizationDTO } from '../dtos/update_organization_dto.js'

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
  constructor(protected ctx: HttpContext) {}

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
  async execute(dto: UpdateOrganizationDTO): Promise<Organization> {
    const user = this.ctx.auth.user!
    const trx = await db.transaction()

    try {
      // 1. Find organization
      const organization = await Organization.find(dto.organizationId)
      if (!organization) {
        throw new Error(`Organization with ID ${dto.organizationId} not found`)
      }

      // 2. Check permissions (Owner or Admin)
      await this.checkPermissions(organization.id, user.id, trx)

      // 3. Store old values for audit
      const oldValues = organization.toJSON()

      // 4. Update organization with provided fields
      const updates = dto.toObject()
      organization.merge(updates)
      await organization.useTransaction(trx).save()

      // 5. Create audit log
      await AuditLog.create(
        {
          user_id: user.id,
          action: 'update',
          entity_type: 'organization',
          entity_id: organization.id,
          old_values: oldValues,
          new_values: organization.toJSON(),
          metadata: JSON.stringify({
            changed_fields: dto.getChangedFields(),
            changes_summary: dto.getChangesSummary(),
          }),
          ip_address: this.ctx.request.ip(),
          user_agent: this.ctx.request.header('user-agent') || '',
        },
        { client: trx }
      )

      await trx.commit()

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
    organizationId: number,
    userId: number,
    trx: unknown
  ): Promise<void> {
    const membership = await db
      .from('organization_users')
      .where('organization_id', organizationId)
      .where('user_id', userId)
      .whereIn('role_id', [1, 2]) // Owner or Admin
      .useTransaction(trx)
      .first()

    if (!membership) {
      throw new Error('You do not have permission to update this organization')
    }
  }
}
