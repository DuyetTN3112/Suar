import { BaseCommand } from '#modules/authorization/actions/base_command'
import type {
  CustomSystemRolePermissionLookup,
  CustomSystemRoleRepository,
} from '#modules/authorization/actions/ports/outbound/custom-system-role/custom_system_role_repository'

export class DeleteCustomSystemRoleCommand extends BaseCommand<[id: string], boolean> {
  constructor(
    private readonly repository: CustomSystemRoleRepository,
    private readonly permissionLookup: CustomSystemRolePermissionLookup
  ) {
    super()
  }

  async execute(id: string): Promise<boolean> {
    const deleted = await this.repository.delete(id)
    if (!deleted) {
      return false
    }

    await this.permissionLookup.refresh()
    return true
  }
}
