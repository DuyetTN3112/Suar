export interface CacheInvalidationOperatorPrincipal {
  id: string
  systemRole: string
  status: string
}

export interface CacheInvalidationOperatorPrincipalReader {
  findPrincipal(
    actorId: string
  ): Promise<CacheInvalidationOperatorPrincipal | null>
}

export interface CacheInvalidationOperatorPermissionReader {
  canManageSystemSettings(systemRole: string): Promise<boolean>
}
