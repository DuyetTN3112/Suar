import { type ExecutionContext } from '#types/execution_context'
import db from '@adonisjs/lucid/services/db'
import type Organization from '#models/organization'
import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'
import OrganizationRepository from '#infra/organizations/repositories/organization_repository'
import UserRepository from '#infra/users/repositories/user_repository'
import CreateAuditLog from '#actions/common/create_audit_log'
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
import BusinessLogicException from '#exceptions/business_logic_exception'
import { enforcePolicy } from '#actions/shared/enforce_policy'
import {
  canCreateOrganization,
  resolveOrganizationBaseSlug,
  resolveUniqueOrganizationSlug,
} from '#domain/organizations/organization_rules'

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
      const creatorIsActive = await UserRepository.isActive(userId, trx)
      enforcePolicy(canCreateOrganization({ actorIsActive: creatorIsActive }))

      // 2. Resolve base slug in domain, then uniqueness via infra callback
      const baseSlug = resolveOrganizationBaseSlug({ name: dto.name, slug: dto.slug })

      // 3. Get unique slug
      const slug = await this.getUniqueSlug(baseSlug, trx)

      // 4. Create organization
      const organization = await OrganizationRepository.create(
        {
          name: dto.name,
          slug: slug,
          description: dto.description || null,
          logo: dto.logo || null,
          website: dto.website || null,
          owner_id: userId,
          plan: null,
        },
        trx
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
      await UserRepository.updateCurrentOrganization(userId, organization.id, trx)

      // 5c. Seed default task statuses + workflow transitions (Phase 4)
      const taskStatusModule = await import('#actions/tasks/commands/seed_default_task_statuses')
      const { seedDefaultTaskStatuses } = taskStatusModule
      await seedDefaultTaskStatuses(organization.id, trx)

      // 6. Create audit log
      await new CreateAuditLog(this.execCtx).handle({
        user_id: userId,
        action: AuditAction.CREATE,
        entity_type: EntityType.ORGANIZATION,
        entity_id: organization.id,
        new_values: organization.toJSON(),
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

  private async getUniqueSlug(baseSlug: string, trx: TransactionClientContract): Promise<string> {
    const slug = await resolveUniqueOrganizationSlug(baseSlug, (candidate) =>
      OrganizationRepository.slugExists(candidate, trx)
    )

    if (!slug) {
      throw new BusinessLogicException('Không thể tạo slug unique')
    }

    return slug
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
