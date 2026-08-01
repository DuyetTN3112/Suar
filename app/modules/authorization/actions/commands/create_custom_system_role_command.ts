import { mapCustomSystemRoleWriteData } from '#modules/authorization/actions/mappers/custom_system_role_write_mapper'
import type {
  CustomSystemRolePermissionLookup,
  CustomSystemRoleRecord,
  CustomSystemRoleRepository,
} from '#modules/authorization/actions/ports/outbound/custom_system_role_repository'

export class CreateCustomSystemRoleCommand {
  constructor(
    private readonly repository: CustomSystemRoleRepository,
    private readonly permissionLookup: CustomSystemRolePermissionLookup
  ) {}

  async execute(
    name: string,
    code: string,
    permissions: string[],
    description?: string
  ): Promise<CustomSystemRoleRecord> {
    const role = await this.repository.create(
      mapCustomSystemRoleWriteData(name, code, permissions, description)
    )
    await this.permissionLookup.refresh()
    return role
  }
}
