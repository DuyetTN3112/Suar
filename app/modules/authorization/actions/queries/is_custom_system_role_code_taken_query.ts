import type { CustomSystemRoleRepository } from '#modules/authorization/actions/ports/outbound/custom_system_role_repository'

export class IsCustomSystemRoleCodeTakenQuery {
  constructor(private readonly repository: CustomSystemRoleRepository) {}

  execute(code: string, exceptRoleId?: string): Promise<boolean> {
    return this.repository.isCodeTaken(code, exceptRoleId)
  }
}
