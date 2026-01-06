import type { CreateOrganizationDTO } from '../dtos/request/create_organization_dto.js'

import { AuditAction, EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import { omitUndefined } from '#modules/contracts/public_contracts/optional_payload'
import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import loggerService from '#modules/logger/public_contracts/application_logger'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
} from '#modules/notifications/public_contracts/notification_constants'
import { buildNotificationEventId } from '#modules/notifications/public_contracts/notification_event_identity'
import {
  OrganizationRole,
  OrganizationUserStatus,
} from '#modules/organizations/access/public_contracts/organization_constants'
import type { OrganizationActionContext } from '#modules/organizations/directory/actions/organization_action_context'
import type { OrganizationEventPublisher } from '#modules/organizations/directory/actions/ports/outbound/organization_event_publisher'
import type { OrganizationUserReaderWriter } from '#modules/organizations/directory/actions/ports/outbound/organization_external_dependencies'
import type { OrganizationNotificationStager } from '#modules/organizations/directory/actions/ports/outbound/organization_notification_stager'
import type {
  OrganizationMembershipRepository,
  OrganizationReader,
  OrganizationRecord,
  OrganizationWriter,
} from '#modules/organizations/directory/actions/ports/outbound/organization_persistence'
import type { OrganizationTaskWorkflowInitializer } from '#modules/organizations/directory/actions/ports/outbound/organization_task_workflow_initializer'
import type {
  OrganizationTransaction,
  OrganizationTransactionRunner,
} from '#modules/organizations/directory/actions/ports/outbound/organization_transaction'
import {
  canCreateOrganization,
  resolveOrganizationBaseSlug,
  resolveUniqueOrganizationSlug,
} from '#modules/organizations/directory/domain/organization_rules'

async function settlePostCommitEffect(
  effectName: string,
  effect: () => Promise<void>,
  context: { organizationId: string; actorId: string }
): Promise<void> {
  try {
    await effect()
  } catch (error) {
    try {
      loggerService.error('Organization post-commit effect failed', {
        effectName,
        committed: true,
        organizationId: context.organizationId,
        actorId: context.actorId,
        errorName: error instanceof Error ? error.name : 'UnknownError',
      })
    } catch {
      // Telemetry failure must not alter the result of an already committed mutation.
    }
  }
}

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
    private notificationStager: OrganizationNotificationStager,
    private readonly userReaderWriter: OrganizationUserReaderWriter,
    private readonly taskWorkflowInitializer: OrganizationTaskWorkflowInitializer,
    private readonly transactionRunner: OrganizationTransactionRunner,
    private readonly organizations: OrganizationReader,
    private readonly organizationWriter: OrganizationWriter,
    private readonly memberships: OrganizationMembershipRepository,
    private readonly organizationEventPublisher: OrganizationEventPublisher
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
    trx: OrganizationTransaction
  ): Promise<OrganizationCreationContext> {
    const creatorIsActive = await this.userReaderWriter.isActiveUser(actorId, trx)
    enforcePolicy(canCreateOrganization({ actorIsActive: creatorIsActive }))

    return {
      baseSlug: resolveOrganizationBaseSlug(omitUndefined({ name: dto.name, slug: dto.slug })),
    }
  }

  private async persistOrganizationCreation(
    dto: CreateOrganizationDTO,
    actorId: string,
    context: OrganizationCreationContext,
    trx: OrganizationTransaction
  ): Promise<PersistedOrganizationCreation> {
    const slug = await this.getUniqueSlug(context.baseSlug, trx)

    const organization = await this.organizationWriter.create(
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
    await this.memberships.add(
      {
        organization_id: organization.id,
        user_id: actorId,
        org_role: OrganizationRole.OWNER,
        status: OrganizationUserStatus.APPROVED,
      },
      trx
    )

    await this.userReaderWriter.updateCurrentOrganization(actorId, organization.id, trx)

    // Seed default task statuses + workflow transitions inside the same transaction.
    await this.taskWorkflowInitializer.seedDefaultStatusesForOrganization(organization.id, trx)

    await auditPublicApi.log(
      {
        user_id: actorId,
        action: AuditAction.CREATE,
        entity_type: EntityType.ORGANIZATION,
        entity_id: organization.id,
        new_values: organization,
      },
      this.execCtx,
      { trx, critical: true }
    )

    await this.stageWelcomeNotification(organization, actorId, trx)

    return { organization }
  }

  private async persistOrganizationCreationInTransaction(
    dto: CreateOrganizationDTO,
    actorId: string
  ): Promise<PersistedOrganizationCreation> {
    return this.transactionRunner.run(async (trx) => {
      const context = await this.loadCreationContext(dto, actorId, trx)
      return this.persistOrganizationCreation(dto, actorId, context, trx)
    })
  }

  private async runPostCommitEffects(
    organization: OrganizationRecord,
    actorId: string
  ): Promise<void> {
    await settlePostCommitEffect(
      'organization.created',
      () =>
        this.organizationEventPublisher.publishOrganizationCreated({
          organizationId: organization.id,
          ownerId: actorId,
          name: organization.name,
          slug: organization.slug,
          ip: this.execCtx.ip,
        }),
      {
        organizationId: organization.id,
        actorId,
      }
    )
  }

  private async getUniqueSlug(baseSlug: string, trx: OrganizationTransaction): Promise<string> {
    const slug = await resolveUniqueOrganizationSlug(baseSlug, (candidate) =>
      this.organizations.slugExists(candidate, trx)
    )

    if (!slug) {
      throw new BusinessLogicException('Không thể tạo slug unique')
    }

    return slug
  }

  private async stageWelcomeNotification(
    organization: OrganizationRecord,
    userId: string,
    trx: OrganizationTransaction
  ): Promise<void> {
    const occurredAt = organization.created_at
    if (!occurredAt) {
      throw new InvariantViolationException(
        'Persisted organization is missing its creation timestamp'
      )
    }

    await this.notificationStager.stage(
      {
        eventId: buildNotificationEventId({
          eventName: 'organization.created',
          businessEventId: organization.id,
          recipientId: userId,
        }),
        type: BACKEND_NOTIFICATION_TYPES.ORGANIZATION_CREATED,
        schemaVersion: 1,
        recipientId: userId,
        scope: { kind: 'organization', id: organization.id },
        actor: { type: 'user', id: userId },
        subject: {
          type: BACKEND_NOTIFICATION_ENTITY_TYPES.ORGANIZATION,
          id: organization.id,
        },
        parameters: {
          organizationName: organization.name,
        },
        occurredAt: new Date(occurredAt).toISOString(),
        correlationId: organization.id,
      },
      { trx }
    )
  }
}
