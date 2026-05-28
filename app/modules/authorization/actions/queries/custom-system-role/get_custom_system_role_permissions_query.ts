import { BaseQuery } from '#modules/authorization/actions/base_query'
import type { CustomSystemRolePermissionLookup } from '#modules/authorization/actions/ports/outbound/custom-system-role/custom_system_role_repository'

export class GetCustomSystemRolePermissionsQuery extends BaseQuery<
  [roleCode: string],
  string[] | null
> {
  constructor(private readonly permissionLookup: CustomSystemRolePermissionLookup) {
    super()
  }

  execute(roleCode: string): Promise<string[] | null> {
    return this.permissionLookup.getRolePermissions(roleCode)
  }
}
