import { BaseQuery } from '#actions/shared/base_query'
import Organization from '#models/organization'
import { getAssignableOrganizationRoles } from '#domain/organizations/org_access_rules'
import { formatRoleLabel } from '#libs/access_surface'

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

    const organization = await Organization.findOrFail(organizationId)
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
