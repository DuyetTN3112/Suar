import type { CustomSystemRolePermissionSnapshot } from '#modules/authorization/actions/ports/outbound/custom_system_role_repository'
import { CustomSystemRolePermissionLookup } from '#modules/authorization/actions/ports/outbound/custom_system_role_repository'

type RolePermissionLoader = () => Promise<CustomSystemRolePermissionSnapshot[]>

interface CustomSystemRolePermissionCacheOptions {
  /**
   * A zero budget is the fail-safe authorization default: every independent
   * lookup revalidates against PostgreSQL. A positive budget is intended only
   * for explicitly reviewed callers/tests.
   */
  maxAgeMs?: number
  now?: () => number
}

export class CustomSystemRolePermissionCache extends CustomSystemRolePermissionLookup {
  private cachedRoles: Map<string, readonly string[]> | null = null
  private loadedAt = 0
  private refreshInFlight: Promise<void> | null = null
  private readonly maxAgeMs: number
  private readonly now: () => number

  constructor(
    private readonly loadRolePermissions: RolePermissionLoader,
    options: CustomSystemRolePermissionCacheOptions = {}
  ) {
    super()
    const maxAgeMs = options.maxAgeMs ?? 0
    if (!Number.isSafeInteger(maxAgeMs) || maxAgeMs < 0 || maxAgeMs > 60_000) {
      throw new RangeError('Custom system role permission cache max age must be 0-60000 ms')
    }
    this.maxAgeMs = maxAgeMs
    this.now = options.now ?? Date.now
  }

  async refresh(): Promise<void> {
    if (this.refreshInFlight) {
      return this.refreshInFlight
    }

    const refresh = this.loadRolePermissions().then((roles) => {
      this.cachedRoles = new Map(
        roles.map((role) => [role.code, Object.freeze([...role.permissions])])
      )
      this.loadedAt = this.now()
    })
    this.refreshInFlight = refresh
    try {
      await refresh
    } finally {
      if (this.refreshInFlight === refresh) {
        this.refreshInFlight = null
      }
    }
  }

  async getRolePermissions(roleCode: string): Promise<string[] | null> {
    await this.ensureLoaded()
    const permissions = this.cachedRoles?.get(roleCode)
    return permissions ? [...permissions] : null
  }

  async isCustomRole(roleCode: string): Promise<boolean> {
    await this.ensureLoaded()
    return this.cachedRoles?.has(roleCode) ?? false
  }

  private async ensureLoaded(): Promise<void> {
    if (
      this.cachedRoles === null ||
      this.maxAgeMs === 0 ||
      this.now() - this.loadedAt >= this.maxAgeMs
    ) {
      await this.refresh()
    }
  }
}
