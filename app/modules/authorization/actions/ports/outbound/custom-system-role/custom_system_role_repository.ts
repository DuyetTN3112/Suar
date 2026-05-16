export interface CustomSystemRoleRecord {
  id: string
  name: string
  code: string
  description: string | null
  permissions: string[]
  createdAt: string | null
  updatedAt: string | null
}

export interface CustomSystemRoleWriteData {
  name: string
  code: string
  permissions: string[]
  description?: string
}

export interface CustomSystemRolePermissionSnapshot {
  code: string
  permissions: string[]
}

export abstract class CustomSystemRoleRepository {
  abstract listPermissionSnapshots(): Promise<CustomSystemRolePermissionSnapshot[]>
  abstract listAll(): Promise<CustomSystemRoleRecord[]>
  abstract find(id: string): Promise<CustomSystemRoleRecord | null>
  abstract isCodeTaken(code: string, exceptRoleId?: string): Promise<boolean>
  abstract create(data: CustomSystemRoleWriteData): Promise<CustomSystemRoleRecord>
  abstract update(
    id: string,
    data: CustomSystemRoleWriteData
  ): Promise<CustomSystemRoleRecord | null>
  abstract delete(id: string): Promise<boolean>
}

export abstract class CustomSystemRolePermissionLookup {
  abstract refresh(): Promise<void>
  abstract getRolePermissions(roleCode: string): Promise<string[] | null>
  abstract isCustomRole(roleCode: string): Promise<boolean>
}
