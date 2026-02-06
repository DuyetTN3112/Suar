import { formatRoleLabel } from '#modules/authorization/domain/access_surface'
import { BaseQuery } from '#modules/organizations/actions/base_query'
import { getAssignableOrganizationRoles } from '#modules/organizations/domain/org_access_rules'
import OrganizationRepository from '#modules/organizations/infra/repositories/read/organization_repository'

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
  async handle(dto: GetAssignableOrganizationRolesDTO): Promise<AssignableOrganizationRolesResult> {
    const organizationId = dto.organizationId ?? this.getCurrentOrganizationId()
    if (!organizationId) {
      throw new Error('Organization context required')
    }

    const organization = await OrganizationRepository.findActiveOrFailRecord(organizationId)
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
