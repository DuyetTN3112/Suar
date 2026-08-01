import type { DeleteOrganizationDTO } from '../dtos/request/delete_organization_dto.js'

import { EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import loggerService from '#modules/logger/public_contracts/application_logger'
import { canDeleteOrganization } from '#modules/organizations/access/domain/org_permission_policy'
import type { OrganizationActionContext } from '#modules/organizations/directory/actions/organization_action_context'
import type { OrganizationEventPublisher } from '#modules/organizations/directory/actions/ports/outbound/organization_event_publisher'
import type {
  OrganizationMembershipRepository,
  OrganizationReader,
  OrganizationWriter,
} from '#modules/organizations/directory/actions/ports/outbound/organization_persistence'
import type { OrganizationProjectLifecycleReader } from '#modules/organizations/directory/actions/ports/outbound/organization_project_lifecycle_reader'
import type { OrganizationTransactionRunner } from '#modules/organizations/directory/actions/ports/outbound/organization_transaction'

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
 * Command: Delete Organization
 *
 * Soft delete (default) or permanent delete.
 *
 * Pattern: FETCH → DECIDE → PERSIST
 */
export default class DeleteOrganizationCommand {
  constructor(
    protected execCtx: OrganizationActionContext,
    private readonly projectLifecycleReader: OrganizationProjectLifecycleReader,
    private readonly transactionRunner: OrganizationTransactionRunner,
    private readonly organizations: OrganizationReader,
    private readonly organizationWriter: OrganizationWriter,
    private readonly memberships: OrganizationMembershipRepository,
    private readonly organizationEventPublisher: OrganizationEventPublisher
  ) {}

  async execute(dto: DeleteOrganizationDTO): Promise<void> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }
    const organizationId = await this.transactionRunner.run(async (trx) => {
      // ── FETCH ──────────────────────────────────────────────────────────
      const organization = await this.organizations.findActiveOrFail(dto.organizationId, trx)

      const actorMembership = await this.memberships.getContext(organization.id, userId, trx)
      const orgRole = actorMembership?.role ?? null
      const deletionType = dto.isPermanentDelete() ? 'permanent' : 'soft'
      const blockingProjectCount =
        deletionType === 'permanent'
          ? await this.projectLifecycleReader.countRetainedProjects(organization.id, trx)
          : await this.projectLifecycleReader.countNonDeletedProjects(organization.id, trx)

      // ── DECIDE (pure, sync) ────────────────────────────────────────────
      enforcePolicy(
        canDeleteOrganization({
          actorId: userId,
          actorOrgRole: orgRole,
          deletionType,
          blockingProjectCount,
        })
      )

      // ── PERSIST ────────────────────────────────────────────────────────
      const oldValues = { ...organization }

      const deletedOrganization = dto.isPermanentDelete()
        ? await this.organizationWriter.hardDelete(organization.id, trx)
        : await this.organizationWriter.softDelete(organization.id, trx)

      await auditPublicApi.log(
        {
          user_id: userId,
          action: dto.isPermanentDelete() ? 'permanent_delete' : 'soft_delete',
          entity_type: EntityType.ORGANIZATION,
          entity_id: organization.id,
          old_values: oldValues,
          new_values: {
            deleted_at: deletedOrganization.deleted_at,
            deletion_type: dto.getDeletionType(),
            reason: dto.getNormalizedReason(),
          },
        },
        this.execCtx,
        { trx, critical: true }
      )

      return organization.id
    })

    await settlePostCommitEffect(
      'organization.deleted',
      () =>
        this.organizationEventPublisher.publishOrganizationDeleted({
          organizationId,
          deletedBy: userId,
        }),
      {
        organizationId,
        actorId: userId,
      }
    )
  }
}
