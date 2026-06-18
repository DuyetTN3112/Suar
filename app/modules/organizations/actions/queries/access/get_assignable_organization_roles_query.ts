import { formatRoleLabel } from '#modules/authorization/public_contracts/access_surface'
import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import type { OrganizationActionContext } from '#modules/organizations/actions/action_context'
import type { OrganizationReader } from '#modules/organizations/actions/ports/outbound/access/organization_persistence'
import { BaseQuery } from '#modules/organizations/actions/queries/base_query'
import { getAssignableOrganizationRoles } from '#modules/organizations/domain/access/org_access_rules'

export interface GetAssignableOrganizationRolesDTO {
  organizationId?: string
}

export interface AssignableOrganizationRoleOption {
  value: string
  label: string
}

export interface AssignableOrganizationRolesResult {
  roleIds: string[]
  roleOptions: AssignableOrganizationRoleOption[]
}

export default class GetAssignableOrganizationRolesQuery extends BaseQuery<
  GetAssignableOrganizationRolesDTO,
  AssignableOrganizationRolesResult
> {
  constructor(
    execCtx: OrganizationActionContext,
    private readonly organizations: OrganizationReader
  ) {
    super(execCtx)
  }

  async handle(dto: GetAssignableOrganizationRolesDTO): Promise<AssignableOrganizationRolesResult> {
    const organizationId = dto.organizationId ?? this.getCurrentOrganizationId()
    if (!organizationId) {
      throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
    }

    const organization = await this.organizations.findActiveOrFail(organizationId)
    const roleIds = [...new Set(getAssignableOrganizationRoles(organization.custom_roles ?? []))]

    return {
      roleIds,
      roleOptions: roleIds.map((role) => ({
        value: role,
        label: formatRoleLabel(role),
      })),
    }
  }
}
