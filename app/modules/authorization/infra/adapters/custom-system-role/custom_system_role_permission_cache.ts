export interface CustomSystemRolePermissionSnapshot {
  code: string
  permissions: string[]
}

export interface CustomSystemRolePermissionCacheOptions {
  maxAgeMs?: number
}

/** Small in-process cache for authorization role snapshots. */
export class CustomSystemRolePermissionCache {
  private snapshot = new Map<string, string[]>()
  private loadedAt = 0
  private inFlight: Promise<void> | null = null
  private readonly maxAgeMs: number

  constructor(
    private readonly loadSnapshots: () => Promise<CustomSystemRolePermissionSnapshot[]>,
    options: CustomSystemRolePermissionCacheOptions = {}
  ) {
    this.maxAgeMs = options.maxAgeMs ?? 0
  }

  async getRolePermissions(roleCode: string): Promise<string[] | null> {
    await this.ensureFresh()
    const permissions = this.snapshot.get(roleCode)
    return permissions ? [...permissions] : null
  }

  async isCustomRole(roleCode: string): Promise<boolean> {
    await this.ensureFresh()
    return this.snapshot.has(roleCode)
  }

  async refresh(): Promise<void> {
    if (this.inFlight) return this.inFlight

    this.inFlight = (async () => {
      const records = await this.loadSnapshots()
      this.snapshot = new Map(
        records.map((record) => [record.code, [...record.permissions]] as const)
      )
      this.loadedAt = Date.now()
    })()

    try {
      await this.inFlight
    } finally {
      this.inFlight = null
    }
  }

  private async ensureFresh(): Promise<void> {
    if (
      this.maxAgeMs > 0 &&
      this.loadedAt > 0 &&
      Date.now() - this.loadedAt <= this.maxAgeMs
    ) {
      return
    }
    await this.refresh()
  }
}
