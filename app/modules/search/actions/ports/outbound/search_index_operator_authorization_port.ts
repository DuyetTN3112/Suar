export interface SearchIndexOperatorPrincipalRecord {
  id: string
  systemRole: string
  status: string
}

export interface SearchIndexOperatorPrincipalReader {
  findPrincipal(actorId: string): Promise<SearchIndexOperatorPrincipalRecord | null>
}

export interface SearchIndexOperatorPermissionReader {
  hasPermission(systemRole: string, permission: string): Promise<boolean>
}
