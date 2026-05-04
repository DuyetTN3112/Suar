import type { AdminCustomSystemRoleRecord } from '#modules/admin/permissions/actions/ports/outbound/permissions/admin_custom_system_role_gateway'
import { AdminCustomSystemRoleGateway } from '#modules/admin/permissions/actions/ports/outbound/permissions/admin_custom_system_role_gateway'
import { CreateCustomSystemRoleCommand } from '#modules/authorization/actions/commands/custom-system-role/create_custom_system_role_command'
import { DeleteCustomSystemRoleCommand } from '#modules/authorization/actions/commands/custom-system-role/delete_custom_system_role_command'
import { RefreshCustomSystemRolePermissionCacheCommand } from '#modules/authorization/actions/commands/custom-system-role/refresh_custom_system_role_permission_cache_command'
import { UpdateCustomSystemRoleCommand } from '#modules/authorization/actions/commands/custom-system-role/update_custom_system_role_command'
import { GetCustomSystemRolePermissionsQuery } from '#modules/authorization/actions/queries/custom-system-role/get_custom_system_role_permissions_query'
import { GetCustomSystemRoleQuery } from '#modules/authorization/actions/queries/custom-system-role/get_custom_system_role_query'
import { IsCustomSystemRoleCodeTakenQuery } from '#modules/authorization/actions/queries/custom-system-role/is_custom_system_role_code_taken_query'
import { IsCustomSystemRoleQuery } from '#modules/authorization/actions/queries/custom-system-role/is_custom_system_role_query'
import { ListCustomSystemRolesQuery } from '#modules/authorization/actions/queries/custom-system-role/list_custom_system_roles_query'
import { CustomSystemRolePermissionCache } from '#modules/authorization/infra/adapters/custom-system-role/custom_system_role_permission_cache'
import CustomSystemRoleRepository from '#modules/authorization/infra/repositories/custom-system-role/custom_system_role_repository'
import type {
  CustomSystemRoleInput,
  CustomSystemRoleProvider,
} from '#modules/authorization/public_contracts/custom-system-role/custom_system_role_api'

interface AuthorizationCustomSystemRoleUseCases {
  refreshCache: RefreshCustomSystemRolePermissionCacheCommand
  getPermissions: GetCustomSystemRolePermissionsQuery
  isCustomRole: IsCustomSystemRoleQuery
  list: ListCustomSystemRolesQuery
  get: GetCustomSystemRoleQuery
  isCodeTaken: IsCustomSystemRoleCodeTakenQuery
  create: CreateCustomSystemRoleCommand
  update: UpdateCustomSystemRoleCommand
  delete: DeleteCustomSystemRoleCommand
}

function createDefaultUseCases(): AuthorizationCustomSystemRoleUseCases {
  const repository = new CustomSystemRoleRepository()
  const permissions = new CustomSystemRolePermissionCache(() =>
    repository.listPermissionSnapshots()
  )
  return {
    refreshCache: new RefreshCustomSystemRolePermissionCacheCommand(permissions),
    getPermissions: new GetCustomSystemRolePermissionsQuery(permissions),
    isCustomRole: new IsCustomSystemRoleQuery(permissions),
    list: new ListCustomSystemRolesQuery(repository),
    get: new GetCustomSystemRoleQuery(repository),
    isCodeTaken: new IsCustomSystemRoleCodeTakenQuery(repository),
    create: new CreateCustomSystemRoleCommand(repository, permissions),
    update: new UpdateCustomSystemRoleCommand(repository, permissions),
    delete: new DeleteCustomSystemRoleCommand(repository, permissions),
  }
}

function toRecord(role: {
  id: string
  name: string
  code: string
  description: string | null
  permissions: string[]
  createdAt: string | null
  updatedAt: string | null
}): AdminCustomSystemRoleRecord {
  return {
    id: role.id,
    name: role.name,
    code: role.code,
    description: role.description,
    permissions: [...role.permissions],
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
  }
}

function argumentsFor(input: CustomSystemRoleInput) {
  return [input.name, input.code, input.permissions, input.description] as const
}

export class AuthorizationAdminCustomSystemRoleAdapter
  extends AdminCustomSystemRoleGateway
  implements CustomSystemRoleProvider
{
  constructor(
    private readonly useCases: AuthorizationCustomSystemRoleUseCases = createDefaultUseCases()
  ) {
    super()
  }

  refreshCache(): Promise<void> {
    return this.useCases.refreshCache.execute()
  }

  getRolePermissions(roleCode: string): Promise<string[] | null> {
    return this.useCases.getPermissions.execute(roleCode)
  }

  isCustomRole(roleCode: string): Promise<boolean> {
    return this.useCases.isCustomRole.execute(roleCode)
  }

  async list(): Promise<AdminCustomSystemRoleRecord[]> {
    const roles = await this.useCases.list.execute()
    return roles.map(toRecord)
  }

  async find(id: string): Promise<AdminCustomSystemRoleRecord | null> {
    const role = await this.useCases.get.execute(id)
    return role ? toRecord(role) : null
  }

  isCodeTaken(code: string, exceptRoleId?: string): Promise<boolean> {
    return this.useCases.isCodeTaken.execute(code, exceptRoleId)
  }

  async create(input: CustomSystemRoleInput): Promise<AdminCustomSystemRoleRecord> {
    const role = await this.useCases.create.execute(...argumentsFor(input))
    return toRecord(role)
  }

  async update(
    id: string,
    input: CustomSystemRoleInput
  ): Promise<AdminCustomSystemRoleRecord | null> {
    const role = await this.useCases.update.execute(id, ...argumentsFor(input))
    return role ? toRecord(role) : null
  }

  delete(id: string): Promise<boolean> {
    return this.useCases.delete.execute(id)
  }
}
