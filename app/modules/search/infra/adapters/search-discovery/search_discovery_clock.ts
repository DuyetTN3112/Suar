let override: { value: number; expiresAt: number } | undefined

export function searchDiscoveryClock(): Date {
  if (override !== undefined && override.expiresAt > Date.now()) {
    return new Date(override.value)
  }
  override = undefined
  return new Date()
}

export function advanceSearchDiscoveryClock(milliseconds: number): void {
  if (!Number.isSafeInteger(milliseconds) || milliseconds < 1) {
    throw new RangeError('Search discovery clock advance must be a positive safe integer')
  }
  override = {
    value: Date.now() + milliseconds,
    expiresAt: Date.now() + 60_000,
  }
}

export function restoreSearchDiscoveryClock(): void {
  override = undefined
}
