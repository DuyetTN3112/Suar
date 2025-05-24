import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import Organization from '#models/organization'
import AuditLog from '#models/audit_log'
import type { CreateOrganizationDTO } from '../dtos/create_organization_dto.js'
import CreateNotification from '#actions/common/create_notification'

/**
 * Command: Create Organization
 *
 * Pattern: Standalone command with explicit transaction (learned from Tasks module)
 * Business rules:
 * - Any authenticated user can create organization
 * - Creator automatically becomes Owner (role_id = 1)
 * - Trigger in database handles owner membership creation
 * - Audit log records creation
 *
 * @example
 * const command = new CreateOrganizationCommand(ctx, createNotification)
 * const org = await command.execute(dto)
 */
export default class CreateOrganizationCommand {
  constructor(
    protected ctx: HttpContext,
    private createNotification: CreateNotification
  ) {}

  /**
   * Execute command: Create new organization
   *
   * Steps:
   * 1. Begin transaction
   * 2. Create organization (owner_id set to current user)
   * 3. Verify trigger created owner membership in organization_users
   * 4. Create audit log
   * 5. Commit transaction
   * 6. Send welcome notification (outside transaction)
   * 7. Load relations and return
   */
  async execute(dto: CreateOrganizationDTO): Promise<Organization> {
    const user = this.ctx.auth.user!
    const trx = await db.transaction()

    try {
      // 1. Create organization
      const organization = await Organization.create(
        {
          ...dto.toObject(),
          owner_id: user.id,
        },
        { client: trx }
      )

      // 2. Verify database trigger added owner to organization_users
      // The trigger should automatically create a record with role_id = 1 (Owner)
      const ownerMembership = await db
        .from('organization_users')
        .where('organization_id', organization.id)
        .where('user_id', user.id)
        .where('role_id', 1)
        .useTransaction(trx)
        .first()

      if (!ownerMembership) {
        throw new Error(
          'Failed to add owner to organization. Database trigger may not be working correctly.'
        )
      }

      // 3. Create audit log
      await AuditLog.create(
        {
          user_id: user.id,
          action: 'create',
          entity_type: 'organization',
          entity_id: organization.id,
          new_values: organization.toJSON(),
          ip_address: this.ctx.request.ip(),
          user_agent: this.ctx.request.header('user-agent') || '',
        },
        { client: trx }
      )

      await trx.commit()

      // 4. Send welcome notification (outside transaction)
      await this.sendWelcomeNotification(organization, user.id)

      // 5. Load relations (if needed)
      // Note: Organization model may not have 'owner' relation defined yet
      // await organization.load((loader) => loader.load('users'))

      return organization
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  /**
   * Helper: Send welcome notification
   * Pattern: Notifications sent after transaction commit (learned from all modules)
   */
  private async sendWelcomeNotification(organization: Organization, userId: number): Promise<void> {
    try {
      await this.createNotification.handle({
        user_id: userId,
        title: 'Tổ chức mới được tạo',
        message: `Bạn đã tạo tổ chức "${organization.name}" thành công. Bạn là Chủ sở hữu của tổ chức này.`,
        type: 'organization_created',
        related_entity_type: 'organization',
        related_entity_id: organization.id,
      })
    } catch (error) {
      // Log error but don't fail the command
      console.error('[CreateOrganizationCommand] Failed to send notification:', error)
    }
  }
}
