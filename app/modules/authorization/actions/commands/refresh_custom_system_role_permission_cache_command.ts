import type { CustomSystemRolePermissionLookup } from '#modules/authorization/actions/ports/outbound/custom_system_role_repository'

export class RefreshCustomSystemRolePermissionCacheCommand {
  constructor(private readonly permissionLookup: CustomSystemRolePermissionLookup) {}

  execute(): Promise<void> {
    return this.permissionLookup.refresh()
  }
}
