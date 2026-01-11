import { mapCustomSystemRoleWriteData } from '#modules/authorization/actions/mappers/custom_system_role_write_mapper'
import type {
  CustomSystemRolePermissionLookup,
  CustomSystemRoleRecord,
  CustomSystemRoleRepository,
} from '#modules/authorization/actions/ports/outbound/custom_system_role_repository'

export class UpdateCustomSystemRoleCommand {
  constructor(
    private readonly repository: CustomSystemRoleRepository,
    private readonly permissionLookup: CustomSystemRolePermissionLookup
  ) {}

  async execute(
    id: string,
    name: string,
    code: string,
    permissions: string[],
    description?: string
  ): Promise<CustomSystemRoleRecord | null> {
    const role = await this.repository.update(
      id,
      mapCustomSystemRoleWriteData(name, code, permissions, description)
    )
    if (!role) {
      return null
    }

    await this.permissionLookup.refresh()
    return role
  }
}
