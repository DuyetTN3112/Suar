export interface CustomSystemRoleRecord {
  id: string
  name: string
  code: string
  description: string | null
  permissions: string[]
  createdAt: string | null
  updatedAt: string | null
}

export interface CustomSystemRoleInput {
  name: string
  code: string
  description?: string | undefined
  permissions: string[]
}

export interface CustomSystemRoleProvider {
  refreshCache(): Promise<void>
  getRolePermissions(roleCode: string): Promise<string[] | null>
  isCustomRole(roleCode: string): Promise<boolean>
  list(): Promise<CustomSystemRoleRecord[]>
  find(id: string): Promise<CustomSystemRoleRecord | null>
  isCodeTaken(code: string, exceptRoleId?: string): Promise<boolean>
  create(input: CustomSystemRoleInput): Promise<CustomSystemRoleRecord>
  update(id: string, input: CustomSystemRoleInput): Promise<CustomSystemRoleRecord | null>
  delete(id: string): Promise<boolean>
}

let provider: CustomSystemRoleProvider | null = null

export function registerCustomSystemRoleProvider(nextProvider: CustomSystemRoleProvider): void {
  provider = nextProvider
}

function requireProvider(): CustomSystemRoleProvider {
  if (!provider) {
    throw new DependencyUnavailableException('custom_system_role_provider', 'resolve')
  }
  return provider
}

export const customSystemRoleApi: CustomSystemRoleProvider = {
  refreshCache: () => requireProvider().refreshCache(),
  getRolePermissions: (roleCode) => requireProvider().getRolePermissions(roleCode),
  isCustomRole: (roleCode) => requireProvider().isCustomRole(roleCode),
  list: () => requireProvider().list(),
  find: (id) => requireProvider().find(id),
  isCodeTaken: (code, exceptRoleId) => requireProvider().isCodeTaken(code, exceptRoleId),
  create: (input) => requireProvider().create(input),
  update: (id, input) => requireProvider().update(id, input),
  delete: (id) => requireProvider().delete(id),
}
import DependencyUnavailableException from '#modules/errors/public_contracts/dependency_unavailable_exception'
