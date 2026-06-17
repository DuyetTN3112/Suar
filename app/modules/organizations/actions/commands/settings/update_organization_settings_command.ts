import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { canUpdateOrganization } from '#modules/organizations/domain/access/org_permission_policy'
import type { OrganizationActionContext } from '#modules/organizations/actions/action_context'
import { BaseCommand } from '#modules/organizations/actions/commands/base_command'
import type { UpdateOrganizationSettingsDTO } from '#modules/organizations/actions/dtos/request/settings/update_organization_settings_dto'
import type {
  OrganizationMembershipRepository,
  OrganizationReader,
  OrganizationWriter,
} from '#modules/organizations/actions/ports/outbound/settings/organization_persistence'
import type { OrganizationTransactionRunner } from '#modules/organizations/actions/ports/outbound/organization_transaction'

type OptionalPayloadKeys<T extends object> = {
  [Key in keyof T]-?: undefined extends T[Key] ? Key : never
}[keyof T]

type OmittedUndefined<T extends object> = {
  [Key in keyof T as Key extends OptionalPayloadKeys<T> ? never : Key]: T[Key]
} & {
  [Key in OptionalPayloadKeys<T>]?: Exclude<T[Key], undefined>
}

function omitUndefined<T extends object>(value: T): OmittedUndefined<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  ) as OmittedUndefined<T>
}


/**
 * UpdateOrganizationSettingsCommand
 *
 * Command to update organization settings.
 */

type OrganizationAuditWriter = Pick<typeof auditPublicApi, 'write'>

export default class UpdateOrganizationSettingsCommand extends BaseCommand<UpdateOrganizationSettingsDTO> {
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

  async handle(dto: UpdateOrganizationSettingsDTO): Promise<void> {
    const organizationId = this.getCurrentOrganizationId()
    const userId = this.getCurrentUserId()
    if (!organizationId) {
      throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
    }
    if (!userId) {
      throw new UnauthorizedException()
    }

    await this.executeInTransaction(async (trx) => {
      const actorMembership = await this.memberships.getContext(
        organizationId,
        userId,
        trx
      )
      const actorOrgRole = actorMembership?.role ?? null
      enforcePolicy(canUpdateOrganization(actorOrgRole))

      const before = await this.organizations.findActiveOrFail(organizationId, trx)
      const updated = await this.organizationWriter.update(
        organizationId,
        omitUndefined({
          name: dto.name,
          description: dto.description,
          website: dto.website,
        }),
        trx
      )

      await this.auditWriter.write(
        this.execCtx,
        {
          action: 'organization.settings.updated',
          entity_type: 'organization',
          entity_id: organizationId,
          event_name: 'organization.settings.updated',
          event_family: 'organization',
          module: 'organizations',
          subsystem: 'settings',
          workflow: 'organization_settings_update',
          stage: 'completed',
          severity: 'info',
          outcome: 'success',
          actor_role_surface: actorOrgRole ?? 'unknown',
          target_type: 'organization',
          target_id: organizationId,
          target_organization_id: organizationId,
          retention_class: 'business_audit',
          critical: true,
          old_values: {
            name: before.name,
            description: before.description,
            website: before.website,
          },
          new_values: {
            name: updated.name,
            description: updated.description,
            website: updated.website,
          },
        },
        trx
      )
    })
  }
}
