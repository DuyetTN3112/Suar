import { BaseQuery } from '#modules/authorization/actions/base_query'
import type {
  CustomSystemRoleRecord,
  CustomSystemRoleRepository,
} from '#modules/authorization/actions/ports/outbound/custom-system-role/custom_system_role_repository'

export class GetCustomSystemRoleQuery extends BaseQuery<
  [id: string],
  CustomSystemRoleRecord | null
> {
  constructor(private readonly repository: CustomSystemRoleRepository) {
    super()
  }

  execute(id: string): Promise<CustomSystemRoleRecord | null> {
    return this.repository.find(id)
  }
}
