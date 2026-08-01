import type { CustomSystemRolePermissionLookup } from '#modules/authorization/actions/ports/outbound/custom_system_role_repository'

export class GetCustomSystemRolePermissionsQuery {
  constructor(private readonly permissionLookup: CustomSystemRolePermissionLookup) {}

  execute(roleCode: string): Promise<string[] | null> {
    return this.permissionLookup.getRolePermissions(roleCode)
  }
}
