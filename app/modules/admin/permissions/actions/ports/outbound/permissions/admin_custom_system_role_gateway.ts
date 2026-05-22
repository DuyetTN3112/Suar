export interface AdminCustomSystemRoleRecord {
  id: string
  name: string
  code: string
  description: string | null
  permissions: string[]
  createdAt: string | null
  updatedAt: string | null
}

export interface AdminCustomSystemRoleInput {
  name: string
  code: string
  description?: string
  permissions: string[]
}

export abstract class AdminCustomSystemRoleGateway {
  abstract list(): Promise<AdminCustomSystemRoleRecord[]>
  abstract find(id: string): Promise<AdminCustomSystemRoleRecord | null>
  abstract isCodeTaken(code: string, exceptRoleId?: string): Promise<boolean>
  abstract create(input: AdminCustomSystemRoleInput): Promise<AdminCustomSystemRoleRecord>
  abstract update(
    id: string,
    input: AdminCustomSystemRoleInput
  ): Promise<AdminCustomSystemRoleRecord | null>
  abstract delete(id: string): Promise<boolean>
}
