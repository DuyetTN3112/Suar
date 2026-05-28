import { BaseCommand } from '#modules/authorization/actions/base_command'
import { mapCustomSystemRoleWriteData } from '#modules/authorization/actions/mappers/custom-system-role/custom_system_role_write_mapper'
import type {
  CustomSystemRolePermissionLookup,
  CustomSystemRoleRecord,
  CustomSystemRoleRepository,
} from '#modules/authorization/actions/ports/outbound/custom-system-role/custom_system_role_repository'

export class CreateCustomSystemRoleCommand extends BaseCommand<
  [name: string, code: string, permissions: string[], description?: string],
  CustomSystemRoleRecord
> {
  constructor(
    private readonly repository: CustomSystemRoleRepository,
    private readonly permissionLookup: CustomSystemRolePermissionLookup
  ) {
    super()
  }

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
