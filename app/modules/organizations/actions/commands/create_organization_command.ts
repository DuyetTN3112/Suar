import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { CreateOrganizationDTO } from '../dtos/request/create_organization_dto.js'
import { DefaultOrganizationDependencies } from '../ports/organization_external_dependencies_impl.js'

import { AuditAction, EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import loggerService from '#modules/logger/public_contracts/logger_service'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
} from '#modules/notifications/public_contracts/notification_constants'
import type { NotificationCreator } from '#modules/notifications/public_contracts/notification_creator'
import type { OrganizationActionContext } from '#modules/organizations/actions/organization_action_context'
import {
  canCreateOrganization,
  resolveOrganizationBaseSlug,
  resolveUniqueOrganizationSlug,
} from '#modules/organizations/domain/organization_rules'
import * as membershipMutations from '#modules/organizations/infra/repositories/organization_user_repository/write/mutation_queries'
import OrganizationRepository from '#modules/organizations/infra/repositories/read/organization_repository'
import * as OrganizationMutations from '#modules/organizations/infra/repositories/write/organization_mutations'
import { OrganizationRole, OrganizationUserStatus } from '#modules/organizations/public_contracts/organization_constants'
import type { OrganizationRecord } from '#modules/organizations/types/organization_records'
import { orgTaskBootstrap } from '#modules/tasks/public_contracts/task_public_api'

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
  organization: OrganizationRecord
}

export default class CreateOrganizationCommand {
  constructor(
    protected execCtx: OrganizationActionContext,
    private createNotification: NotificationCreator
  ) {}

  /**
   * Execute command: Create new organization
   *
   * Pattern: REQUIRE ACTOR → FETCH/VALIDATE → PERSIST → POST-COMMIT
   */
  async execute(dto: CreateOrganizationDTO): Promise<OrganizationRecord> {
    const actorId = this.requireActorId()
    const creation = await this.persistOrganizationCreationInTransaction(dto, actorId)
    await this.runPostCommitEffects(creation.organization, actorId)
    return creation.organization
  }

  private requireActorId(): string {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException('Unauthorized')
    }

    return userId
  }

  private async loadCreationContext(
    dto: CreateOrganizationDTO,
    actorId: string,
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
    actorId: string,
    context: OrganizationCreationContext,
    trx: TransactionClientContract
  ): Promise<PersistedOrganizationCreation> {
    const slug = await this.getUniqueSlug(context.baseSlug, trx)

    const organization = await OrganizationMutations.createRecord(
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
    await membershipMutations.addMember(
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
    await orgTaskBootstrap.seedDefaultStatusesForOrganization(organization.id, trx)

    await auditPublicApi.log(
      {
        user_id: actorId,
        action: AuditAction.CREATE,
        entity_type: EntityType.ORGANIZATION,
        entity_id: organization.id,
        new_values: organization,
      },
      this.execCtx
    )

    return { organization }
  }

  private async persistOrganizationCreationInTransaction(
    dto: CreateOrganizationDTO,
    actorId: string
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
    organization: OrganizationRecord,
    actorId: string
  ): Promise<void> {
    void emitter.emit('organization:created', {
      organizationId: organization.id,
      ownerId: actorId,
      name: organization.name,
      slug: organization.slug,
      ip: this.execCtx.ip,
    })

    await cacheStore.deleteByPattern(`organization:*`)

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
    organization: OrganizationRecord,
    userId: string
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
