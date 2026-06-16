import { AuditAction, EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import AppException from '#modules/errors/public_contracts/application_exception'
import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { Result } from '#modules/errors/public_contracts/result'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import type { OrganizationActionContext } from '#modules/organizations/actions/action_context'
import type { OrganizationUserReaderWriter } from '#modules/organizations/actions/ports/outbound/access/organization_external_dependencies'
import type {
  OrganizationMembershipRepository,
  OrganizationReader,
} from '#modules/organizations/actions/ports/outbound/access/organization_persistence'
import type { OrganizationTransactionRunner } from '#modules/organizations/actions/ports/outbound/organization_transaction'
import { canSwitchOrganization } from '#modules/organizations/domain/access/org_permission_policy'
import { canAccessOrganizationAdminShell } from '#modules/organizations/public_contracts/access/organization_access'

/**
 * Command: Switch Organization
 *
 * Pattern: Simple state update (learned from all modules)
 * Business rules:
 * - User must be a member of target organization
 * - Update current_organization_id in users table
 * - This affects which organization's data user sees by default
 *
 * @example
 * const command = new SwitchOrganizationCommand(ctx)
 * await command.execute(organizationId)
 */
export default class SwitchOrganizationCommand {
  constructor(
    protected execCtx: OrganizationActionContext,
    private readonly userReaderWriter: OrganizationUserReaderWriter,
    private readonly transactionRunner: OrganizationTransactionRunner,
    private readonly organizations: OrganizationReader,
    private readonly memberships: OrganizationMembershipRepository
  ) {}

  async executeAndWrap(
    organizationId: string
  ): Promise<
    Result<
      {
        organization: { id: string; name: string }
        redirectPath: string
      },
      AppException
    >
  > {
    try {
      return Result.ok(await this.execute(organizationId))
    } catch (error) {
      if (error instanceof AppException) return Result.fail(error)
      throw error
    }
  }

  /**
   * Execute command: Switch user's current organization
   *
   * Steps:
   * 1. Validate user is member of target organization
   * 2. Begin transaction
   * 3. Update user's current_organization_id
   * 4. Create audit log
   * 5. Commit transaction
   */
  async execute(organizationId: string): Promise<{
    organization: { id: string; name: string }
    redirectPath: string
  }> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException('Unauthorized')
    }
    return this.transactionRunner.run(async (trx) => {
      const organization = await this.organizations.findBasicInfo(organizationId, trx)
      const membershipContext = await this.memberships.getContext(
        organizationId,
        userId,
        trx,
        true
      )
      const actorOrgRole = membershipContext?.role ?? null
      const user = await this.userReaderWriter.findUserIdentity(userId, trx)

      if (!organization) {
        throw NotFoundException.resource('Tổ chức', organizationId)
      }

      if (!user) {
        throw NotFoundException.resource('Người dùng', userId)
      }

      const isActiveUser = await this.userReaderWriter.isActiveUser(userId, trx)
      if (!isActiveUser) {
        throw new ForbiddenException('Suspended users cannot switch organization')
      }

      enforcePolicy(canSwitchOrganization(actorOrgRole))

      // 2. Get current organization for audit log
      const currentOrganizationId = user.current_organization_id

      // 3. Update user's current organization
      await this.userReaderWriter.updateCurrentOrganization(
        userId,
        organizationId,
        trx
      )

      // 4. Create audit log
      await auditPublicApi.log(
        {
          user_id: userId,
          action: AuditAction.SWITCH_ORGANIZATION,
          entity_type: EntityType.USER,
          entity_id: userId,
          old_values: { current_organization_id: currentOrganizationId },
          new_values: { current_organization_id: organizationId },
        },
        this.execCtx,
        { trx, critical: true }
      )

      return {
        organization: {
          id: organization.id,
          name: organization.name,
        },
        redirectPath: canAccessOrganizationAdminShell(actorOrgRole).allowed ? '/org' : '/projects',
      }
    })
  }
}
