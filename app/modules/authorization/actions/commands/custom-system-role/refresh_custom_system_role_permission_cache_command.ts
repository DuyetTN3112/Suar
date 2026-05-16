import { BaseCommand } from '#modules/authorization/actions/base_command'
import type { CustomSystemRolePermissionLookup } from '#modules/authorization/actions/ports/outbound/custom-system-role/custom_system_role_repository'

export class RefreshCustomSystemRolePermissionCacheCommand extends BaseCommand<[], void> {
  constructor(private readonly permissionLookup: CustomSystemRolePermissionLookup) {
    super()
  }

  execute(): Promise<void> {
    return this.permissionLookup.refresh()
  }
}
