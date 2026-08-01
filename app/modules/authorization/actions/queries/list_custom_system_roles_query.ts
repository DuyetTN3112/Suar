import type {
  CustomSystemRoleRecord,
  CustomSystemRoleRepository,
} from '#modules/authorization/actions/ports/outbound/custom_system_role_repository'

export class ListCustomSystemRolesQuery {
  constructor(private readonly repository: CustomSystemRoleRepository) {}

  execute(): Promise<CustomSystemRoleRecord[]> {
    return this.repository.listAll()
  }
}
