import { type ExecutionContext } from '#types/execution_context'
import db from '@adonisjs/lucid/services/db'
import Organization from '#models/organization'
import OrganizationUserRepository from '#repositories/organization_user_repository'
import OrganizationRepository from '#repositories/organization_repository'
import AuditLog from '#models/mongo/audit_log'
import { OrganizationRole, OrganizationUserStatus } from '#constants/organization_constants'
import { AuditAction, EntityType } from '#constants/audit_constants'
import type { CreateOrganizationDTO } from '../dtos/request/create_organization_dto.js'
import type CreateNotification from '#actions/common/create_notification'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import CacheService from '#services/cache_service'
import emitter from '@adonisjs/core/services/emitter'
import loggerService from '#services/logger_service'
import type { DatabaseId } from '#types/database'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import NotFoundException from '#exceptions/not_found_exception'

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
    protected execCtx: ExecutionContext,
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
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException('Unauthorized')
    }
    const trx = await db.transaction()

    try {
      // 1. Check creator active (logic từ database procedure)
      // Procedure: Check creator không tồn tại hoặc không active
      await this.validateCreatorActive(userId, trx)

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
          owner_id: String(userId),
          plan: dto.plan || 'free',
        },
        { client: trx }
      )

      // 5. Add owner to organization_users → delegate to Model
      // v3: org_role is inline VARCHAR, no more role_id FK
      await OrganizationUserRepository.addMember(
        {
          organization_id: organization.id,
          user_id: userId,
          org_role: OrganizationRole.OWNER,
          status: OrganizationUserStatus.APPROVED,
        },
        trx
      )

      // 5b. Set user's current_organization_id
      const User = (await import('#models/user')).default
      await User.query({ client: trx })
        .where('id', userId)
        .update({ current_organization_id: organization.id })

      // 5c. Seed default task statuses + workflow transitions (Phase 4)
      const { seedDefaultTaskStatuses } =
        await import('#actions/tasks/commands/seed_default_task_statuses')
      await seedDefaultTaskStatuses(organization.id, trx)

      // 6. Create audit log
      await AuditLog.create({
        user_id: userId,
        action: AuditAction.CREATE,
        entity_type: EntityType.ORGANIZATION,
        entity_id: organization.id,
        new_values: organization.toJSON(),
        ip_address: this.execCtx.ip,
        user_agent: this.execCtx.userAgent,
      })

      await trx.commit()

      // Emit domain event (replaces after_organization_insert trigger side-effects)
      void emitter.emit('organization:created', {
        organization,
        ownerId: userId,
        ip: this.execCtx.ip,
      })

      // Invalidate organization caches
      await CacheService.deleteByPattern(`organization:*`)

      // 7. Send welcome notification (outside transaction)
      await this.sendWelcomeNotification(organization, userId)

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
    userId: DatabaseId,
    trx: TransactionClientContract
  ): Promise<void> {
    const UserRepository = (await import('#repositories/user_repository')).default
    const isActive = await UserRepository.isActive(userId, trx)
    if (!isActive) {
      throw new NotFoundException('Creator không tồn tại hoặc không active')
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
   * Get unique slug with auto-increment counter → delegate to Model
   */
  private async getUniqueSlug(baseSlug: string, trx: TransactionClientContract): Promise<string> {
    return OrganizationRepository.getUniqueSlug(baseSlug, trx)
  }

  /**
   * Helper: Send welcome notification
   */
  private async sendWelcomeNotification(
    organization: Organization,
    userId: DatabaseId
  ): Promise<void> {
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
      loggerService.error('[CreateOrganizationCommand] Failed to send notification:', error)
    }
  }
}
