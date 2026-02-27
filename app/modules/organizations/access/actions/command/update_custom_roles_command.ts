import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import type { OrganizationActionContext } from '#modules/organizations/access/actions/action_context'
import { BaseCommand } from '#modules/organizations/access/actions/command/base_command'
import type {
  OrganizationMembershipRepository,
  OrganizationReader,
  OrganizationWriter,
} from '#modules/organizations/access/actions/ports/outbound/organization_persistence'
import type { OrganizationTransactionRunner } from '#modules/organizations/access/actions/ports/outbound/organization_transaction'
import { sanitizeCustomRoleDefinitions } from '#modules/organizations/access/domain/org_access_rules'
import { canUpdateOrganization } from '#modules/organizations/access/domain/org_permission_policy'

export interface UpdateCustomRolesDTO {
  custom_roles: unknown
}

type OrganizationAuditWriter = Pick<typeof auditPublicApi, 'write'>

export default class UpdateCustomRolesCommand extends BaseCommand<UpdateCustomRolesDTO> {
  constructor(
    execCtx: OrganizationActionContext,
    transactionRunner: OrganizationTransactionRunner,
    private readonly organizations: OrganizationReader,
    private readonly organizationWriter: OrganizationWriter,
    private readonly memberships: OrganizationMembershipRepository,
    private auditWriter: OrganizationAuditWriter = auditPublicApi
  ) {
    super(execCtx, transactionRunner)
  }

  async handle(dto: UpdateCustomRolesDTO): Promise<void> {
    const organizationId = this.getCurrentOrganizationId()
    const userId = this.getCurrentUserId()
    if (!organizationId) {
      throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
    }
    if (!userId) {
      throw new UnauthorizedException()
    }

    const customRoles = sanitizeCustomRoleDefinitions(dto.custom_roles)

    await this.executeInTransaction(async (trx) => {
      const actorMembership = await this.memberships.getContext(
        organizationId,
        userId,
        trx
      )
      const actorOrgRole = actorMembership?.role ?? null
      enforcePolicy(canUpdateOrganization(actorOrgRole))

      const before = await this.organizations.findActiveOrFail(organizationId, trx)
      await this.organizationWriter.update(
        organizationId,
        {
          custom_roles: customRoles,
        },
        trx
      )

      await this.auditWriter.write(
        this.execCtx,
        {
          action: 'organization.custom_roles.updated',
          entity_type: 'organization',
          entity_id: organizationId,
          event_name: 'organization.custom_roles.updated',
          event_family: 'access',
          module: 'organizations',
          subsystem: 'access_control',
          workflow: 'organization_custom_roles_update',
          stage: 'completed',
          severity: 'info',
          outcome: 'success',
          actor_role_surface: actorOrgRole ?? 'unknown',
          target_type: 'organization',
          target_id: organizationId,
          target_organization_id: organizationId,
          retention_class: 'security_audit',
          critical: true,
          old_values: {
            custom_roles: sanitizeCustomRoleDefinitions(before.custom_roles),
          },
          new_values: {
            custom_roles: customRoles,
          },
        },
        trx
      )
    })
  }
}
