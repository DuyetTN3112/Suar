export type UnknownSearchRecord = Record<string, unknown>

export function asSearchRecord(value: unknown): UnknownSearchRecord {
  return value && typeof value === 'object' ? (value as UnknownSearchRecord) : {}
}

export function readSearchRecordString(
  record: UnknownSearchRecord,
  candidates: readonly string[]
): string | null {
  for (const candidate of candidates) {
    const value = record[candidate]
    if (typeof value === 'string' && value.trim()) {
      return value
    }
  }
  return null
}

export function compactSearchBreadcrumbs(parts: ReadonlyArray<string | null>): string[] {
  return parts.filter((part): part is string => Boolean(part))
}
