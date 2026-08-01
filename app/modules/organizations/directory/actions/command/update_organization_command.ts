import type { UpdateOrganizationDTO } from '../dtos/request/update_organization_dto.js'

import { AuditAction, EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import loggerService from '#modules/logger/public_contracts/application_logger'
import { canUpdateOrganization } from '#modules/organizations/access/domain/org_permission_policy'
import type { OrganizationActionContext } from '#modules/organizations/directory/actions/organization_action_context'
import type { OrganizationEventPublisher } from '#modules/organizations/directory/actions/ports/outbound/organization_event_publisher'
import type {
  OrganizationMembershipRepository,
  OrganizationReader,
  OrganizationRecord,
  OrganizationWriter,
} from '#modules/organizations/directory/actions/ports/outbound/organization_persistence'
import type {
  OrganizationTransaction,
  OrganizationTransactionRunner,
} from '#modules/organizations/directory/actions/ports/outbound/organization_transaction'

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
  constructor(
    protected execCtx: OrganizationActionContext,
    private readonly transactionRunner: OrganizationTransactionRunner,
    private readonly organizations: OrganizationReader,
    private readonly organizationWriter: OrganizationWriter,
    private readonly memberships: OrganizationMembershipRepository,
    private readonly organizationEventPublisher: OrganizationEventPublisher
  ) {}

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
  async execute(dto: UpdateOrganizationDTO): Promise<OrganizationRecord> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException('Unauthorized')
    }
    const result = await this.transactionRunner.run(async (trx) => {
      // 1. Find organization
      const organization = await this.organizations.findActiveOrFail(dto.organizationId, trx)

      // 2. Check permissions (Owner or Admin)
      await this.checkPermissions(organization.id, userId, trx)

      // 3. Store old values for audit
      const oldValues = { ...organization }

      // 4. Update organization with provided fields
      const updates = dto.toObject()
      const updatedOrganization = await this.organizationWriter.update(
        organization.id,
        updates,
        trx
      )

      // 5. Create audit log
      await auditPublicApi.log(
        {
          user_id: userId,
          action: AuditAction.UPDATE,
          entity_type: EntityType.ORGANIZATION,
          entity_id: organization.id,
          old_values: oldValues,
          new_values: updatedOrganization,
        },
        this.execCtx,
        { trx, critical: true }
      )

      return {
        organizationId: organization.id,
        updatedOrganization,
        updates,
      }
    })

    await settlePostCommitEffect(
      'organization.updated',
      () =>
        this.organizationEventPublisher.publishOrganizationUpdated({
          organizationId: result.organizationId,
          updatedBy: userId,
          changes: result.updates,
        }),
      {
        organizationId: result.organizationId,
        actorId: userId,
      }
    )

    return result.updatedOrganization
  }

  /**
   * Helper: Check if user has permission to update organization
   * Only Owner (role_id = 1) or Admin (role_id = 2) can update
   */
  private async checkPermissions(
    organizationId: string,
    userId: string,
    trx: OrganizationTransaction
  ): Promise<void> {
    const actorMembership = await this.memberships.getContext(organizationId, userId, trx)
    const actorOrgRole = actorMembership?.role ?? null

    enforcePolicy(canUpdateOrganization(actorOrgRole))
  }
}
