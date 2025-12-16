import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import Organization from '#models/organization'
import AuditLog from '#models/audit_log'
import type { CreateOrganizationDTO } from '../dtos/create_organization_dto.js'
import type CreateNotification from '#actions/common/create_notification'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

/**
 * Command: Create Organization
 *
 * Di chuyển logic từ database triggers:
 * - before_organization_insert: Auto generate slug từ name
 * - after_organization_insert: Add owner to organization_users với role_id = 1
 *
 * Business rules:
 * - Any authenticated user can create organization
 * - Creator automatically becomes Owner (role_id = 1)
 * - Slug auto-generated nếu không cung cấp
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
   * 1. Generate slug (logic từ before_organization_insert trigger)
   * 2. Begin transaction
   * 3. Create organization
   * 4. Add owner to organization_users (logic từ after_organization_insert trigger)
   * 5. Create audit log
   * 6. Commit transaction
   * 7. Send welcome notification (outside transaction)
   */
  async execute(dto: CreateOrganizationDTO): Promise<Organization> {
    const user = this.ctx.auth.user
    if (!user) {
      throw new Error('Unauthorized')
    }
    const trx = await db.transaction()

    try {
      // 1. Check creator active (logic từ database procedure)
      // Procedure: Check creator không tồn tại hoặc không active
      await this.validateCreatorActive(user.id, trx)

      // 2. Generate slug if not provided (logic từ before_organization_insert trigger)
      const baseSlug = dto.slug || this.generateSlug(dto.name)

      // 3. Get unique slug (loop như database procedure)
      const slug = await this.getUniqueSlug(baseSlug, trx)

      // 4. Create organization
      const organization = await Organization.create(
        {
          name: dto.name,
          slug: slug,
          description: dto.description || null,
          logo: dto.logo || null,
          website: dto.website || null,
          owner_id: user.id,
        },
        { client: trx }
      )

      // 5. Add owner to organization_users (logic từ after_organization_insert trigger)
      // Trigger: INSERT INTO organization_users (organization_id, user_id, role_id) VALUES (NEW.id, NEW.owner_id, 1)
      await db
        .table('organization_users')
        .insert({
          organization_id: organization.id,
          user_id: user.id,
          role_id: 1, // Owner role
          status: 'approved',
          created_at: new Date(),
          updated_at: new Date(),
        })
        .useTransaction(trx)

      // 6. Create audit log
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

      // 7. Send welcome notification (outside transaction)
      await this.sendWelcomeNotification(organization, user.id)

      return organization
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  /**
   * Validate creator is active
   * Logic từ database procedure:
   *   IF NOT EXISTS (SELECT 1 FROM users u JOIN user_status us ON u.status_id = us.id
   *   WHERE u.id = p_creator_id AND u.deleted_at IS NULL AND us.name = 'active')
   *   THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Creator không tồn tại hoặc không active'
   */
  private async validateCreatorActive(
    userId: number,
    trx: TransactionClientContract
  ): Promise<void> {
    const user = await db
      .from('users')
      .join('user_status', 'users.status_id', 'user_status.id')
      .where('users.id', userId)
      .whereNull('users.deleted_at')
      .where('user_status.name', 'active')
      .useTransaction(trx)
      .first()

    if (!user) {
      throw new Error('Creator không tồn tại hoặc không active')
    }
  }

  /**
   * Generate slug from name
   * Logic từ before_organization_insert trigger:
   *   SET NEW.slug = LOWER(REGEXP_REPLACE(NEW.name, '[^a-z0-9]+', '-'));
   *   SET NEW.slug = REGEXP_REPLACE(NEW.slug, '^-|-$', '');
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with dash
      .replace(/^-|-$/g, '') // Remove leading/trailing dashes
  }

  /**
   * Get unique slug with auto-increment counter
   * Logic từ database procedure:
   *   WHILE EXISTS (SELECT 1 FROM organizations WHERE slug = v_final_slug AND deleted_at IS NULL) DO
   *     SET v_final_slug = CONCAT(v_generated_slug, '-', v_slug_counter);
   *     SET v_slug_counter = v_slug_counter + 1;
   *   END WHILE;
   */
  private async getUniqueSlug(baseSlug: string, trx: TransactionClientContract): Promise<string> {
    let slug = baseSlug
    let counter = 1

    while (true) {
      const existing = await db
        .from('organizations')
        .where('slug', slug)
        .whereNull('deleted_at')
        .useTransaction(trx)
        .first()

      if (!existing) return slug

      slug = `${baseSlug}-${counter}`
      counter++

      // Safety limit
      if (counter > 1000) {
        throw new Error('Không thể tạo slug unique')
      }
    }
  }

  /**
   * Helper: Send welcome notification
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
      console.error('[CreateOrganizationCommand] Failed to send notification:', error)
    }
  }
}
