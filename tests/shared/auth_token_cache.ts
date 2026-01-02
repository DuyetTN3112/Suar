export interface TestingTokenState {
  accessToken: string
  refreshToken: string
  organizationId?: string | null
  systemRole?: string | null
}

const testingTokenCache = new Map<string, TestingTokenState>()

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function normalizeOrganizationId(organizationId?: string | null): string {
  return organizationId?.trim() ?? '__default__'
}

function buildCacheKey(email: string, organizationId?: string | null): string {
  return `${normalizeEmail(email)}::${normalizeOrganizationId(organizationId)}`
}

export function getCachedTestingToken(
  email: string,
  organizationId?: string | null
): TestingTokenState | null {
  return testingTokenCache.get(buildCacheKey(email, organizationId)) ?? null
}

export function getAnyCachedTestingToken(email: string): TestingTokenState | null {
  const normalizedEmail = normalizeEmail(email)

  for (const [key, state] of testingTokenCache.entries()) {
    if (key.startsWith(`${normalizedEmail}::`)) {
      return state
    }
  }

  return null
}

export function setCachedTestingToken(
  email: string,
  state: TestingTokenState,
  organizationId?: string | null
): void {
  const effectiveOrganizationId = organizationId ?? state.organizationId ?? null
  testingTokenCache.set(buildCacheKey(email, effectiveOrganizationId), state)
}

export function clearCachedTestingTokens(email: string): void {
  const normalizedEmail = normalizeEmail(email)

  for (const key of testingTokenCache.keys()) {
    if (key.startsWith(`${normalizedEmail}::`)) {
      testingTokenCache.delete(key)
    }
  }
}
