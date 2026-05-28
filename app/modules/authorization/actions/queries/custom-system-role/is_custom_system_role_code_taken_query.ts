import { BaseQuery } from '#modules/authorization/actions/base_query'
import type { CustomSystemRoleRepository } from '#modules/authorization/actions/ports/outbound/custom-system-role/custom_system_role_repository'

export class IsCustomSystemRoleCodeTakenQuery extends BaseQuery<
  [code: string, exceptRoleId?: string],
  boolean
> {
  constructor(private readonly repository: CustomSystemRoleRepository) {
    super()
  }

  execute(code: string, exceptRoleId?: string): Promise<boolean> {
    return this.repository.isCodeTaken(code, exceptRoleId)
  }
}
