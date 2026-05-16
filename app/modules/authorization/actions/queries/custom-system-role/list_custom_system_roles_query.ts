import { BaseQuery } from '#modules/authorization/actions/base_query'
import type {
  CustomSystemRoleRecord,
  CustomSystemRoleRepository,
} from '#modules/authorization/actions/ports/outbound/custom-system-role/custom_system_role_repository'

export class ListCustomSystemRolesQuery extends BaseQuery<[], CustomSystemRoleRecord[]> {
  constructor(private readonly repository: CustomSystemRoleRepository) {
    super()
  }

  execute(): Promise<CustomSystemRoleRecord[]> {
    return this.repository.listAll()
  }
}
