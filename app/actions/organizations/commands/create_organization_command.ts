import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { CreateOrganizationDTO } from '../dtos/request/create_organization_dto.js'

import CreateAuditLog from '#actions/audit/create_audit_log'
import { enforcePolicy } from '#actions/authorization/enforce_policy'
import type CreateNotification from '#actions/common/create_notification'
import { AuditAction, EntityType } from '#constants/audit_constants'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
} from '#constants/notification_constants'
import { OrganizationRole, OrganizationUserStatus } from '#constants/organization_constants'
import {
  canCreateOrganization,
  resolveOrganizationBaseSlug,
  resolveUniqueOrganizationSlug,
} from '#domain/organizations/organization_rules'
import BusinessLogicException from '#exceptions/business_logic_exception'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import CacheService from '#infra/cache/cache_service'
import loggerService from '#infra/logger/logger_service'
import OrganizationRepository from '#infra/organizations/repositories/organization_repository'
import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'
import type Organization from '#models/organization'
import type { DatabaseId } from '#types/database'
import { type ExecutionContext } from '#types/execution_context'

import { DefaultOrganizationDependencies } from '../ports/organization_external_dependencies_impl.js'

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
interface OrganizationCreationContext {
  baseSlug: string
}

interface PersistedOrganizationCreation {
  organization: Organization
}

export default class CreateOrganizationCommand {
  constructor(
    protected execCtx: ExecutionContext,
    private createNotification: CreateNotification
  ) {}

  /**
   * Execute command: Create new organization
   *
   * Pattern: REQUIRE ACTOR → FETCH/VALIDATE → PERSIST → POST-COMMIT
   */
  async execute(dto: CreateOrganizationDTO): Promise<Organization> {
    const actorId = this.requireActorId()
    const creation = await this.persistOrganizationCreationInTransaction(dto, actorId)
    await this.runPostCommitEffects(creation.organization, actorId)
    return creation.organization
  }

  private requireActorId(): DatabaseId {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException('Unauthorized')
    }

    return userId
  }

  private async loadCreationContext(
    dto: CreateOrganizationDTO,
    actorId: DatabaseId,
    trx: TransactionClientContract
  ): Promise<OrganizationCreationContext> {
    const creatorIsActive = await DefaultOrganizationDependencies.user.isActiveUser(actorId, trx)
    enforcePolicy(canCreateOrganization({ actorIsActive: creatorIsActive }))

    return {
      baseSlug: resolveOrganizationBaseSlug({ name: dto.name, slug: dto.slug }),
    }
  }

  private async persistOrganizationCreation(
    dto: CreateOrganizationDTO,
    actorId: DatabaseId,
    context: OrganizationCreationContext,
    trx: TransactionClientContract
  ): Promise<PersistedOrganizationCreation> {
    const slug = await this.getUniqueSlug(context.baseSlug, trx)

    const organization = await OrganizationRepository.create(
      {
        name: dto.name,
        slug,
        description: dto.description ?? null,
        logo: dto.logo ?? null,
        website: dto.website ?? null,
        owner_id: actorId,
        plan: null,
      },
      trx
    )

    // v3: org_role is inline VARCHAR, no more role_id FK
    await OrganizationUserRepository.addMember(
      {
        organization_id: organization.id,
        user_id: actorId,
        org_role: OrganizationRole.OWNER,
        status: OrganizationUserStatus.APPROVED,
      },
      trx
    )

    await DefaultOrganizationDependencies.user.updateCurrentOrganization(
      actorId,
      organization.id,
      trx
    )

    // Seed default task statuses + workflow transitions inside the same transaction.
    const taskStatusModule = await import('#actions/tasks/commands/seed_default_task_statuses')
    const { seedDefaultTaskStatuses } = taskStatusModule
    await seedDefaultTaskStatuses(organization.id, trx)

    await new CreateAuditLog(this.execCtx).handle({
      user_id: actorId,
      action: AuditAction.CREATE,
      entity_type: EntityType.ORGANIZATION,
      entity_id: organization.id,
      new_values: organization.toJSON(),
    })

    return { organization }
  }

  private async persistOrganizationCreationInTransaction(
    dto: CreateOrganizationDTO,
    actorId: DatabaseId
  ): Promise<PersistedOrganizationCreation> {
    const trx = await db.transaction()

    try {
      const context = await this.loadCreationContext(dto, actorId, trx)
      const creation = await this.persistOrganizationCreation(dto, actorId, context, trx)
      await trx.commit()
      return creation
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  private async runPostCommitEffects(
    organization: Organization,
    actorId: DatabaseId
  ): Promise<void> {
    void emitter.emit('organization:created', {
      organization,
      ownerId: actorId,
      ip: this.execCtx.ip,
    })

    await CacheService.deleteByPattern(`organization:*`)

    await this.sendWelcomeNotification(organization, actorId)
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
        type: BACKEND_NOTIFICATION_TYPES.ORGANIZATION_CREATED,
        related_entity_type: BACKEND_NOTIFICATION_ENTITY_TYPES.ORGANIZATION,
        related_entity_id: organization.id,
      })
    } catch (error) {
      loggerService.error('[CreateOrganizationCommand] Failed to send notification:', error)
    }
  }
}
