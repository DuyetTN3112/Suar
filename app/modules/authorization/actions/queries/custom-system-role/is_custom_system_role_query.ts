import { BaseQuery } from '#modules/authorization/actions/base_query'
import type { CustomSystemRolePermissionLookup } from '#modules/authorization/actions/ports/outbound/custom-system-role/custom_system_role_repository'

export class IsCustomSystemRoleQuery extends BaseQuery<[roleCode: string], boolean> {
  constructor(private readonly permissionLookup: CustomSystemRolePermissionLookup) {
    super()
  }

  execute(roleCode: string): Promise<boolean> {
    return this.permissionLookup.isCustomRole(roleCode)
  }
}
