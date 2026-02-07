import type {
  CustomSystemRolePermissionLookup,
  CustomSystemRoleRepository,
} from '#modules/authorization/actions/ports/outbound/custom_system_role_repository'

export class DeleteCustomSystemRoleCommand {
  constructor(
    private readonly repository: CustomSystemRoleRepository,
    private readonly permissionLookup: CustomSystemRolePermissionLookup
  ) {}

  async execute(id: string): Promise<boolean> {
    const deleted = await this.repository.delete(id)
    if (!deleted) {
      return false
    }

    await this.permissionLookup.refresh()
    return true
  }
}
