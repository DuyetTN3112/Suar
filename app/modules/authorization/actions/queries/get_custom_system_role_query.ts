import type {
  CustomSystemRoleRecord,
  CustomSystemRoleRepository,
} from '#modules/authorization/actions/ports/outbound/custom_system_role_repository'

export class GetCustomSystemRoleQuery {
  constructor(private readonly repository: CustomSystemRoleRepository) {}

  execute(id: string): Promise<CustomSystemRoleRecord | null> {
    return this.repository.find(id)
  }
}
