import type { CustomSystemRolePermissionLookup } from '#modules/authorization/actions/ports/outbound/custom_system_role_repository'

export class IsCustomSystemRoleQuery {
  constructor(private readonly permissionLookup: CustomSystemRolePermissionLookup) {}

  execute(roleCode: string): Promise<boolean> {
    return this.permissionLookup.isCustomRole(roleCode)
  }
}
