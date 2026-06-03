import ValidationException from '#modules/errors/public_contracts/validation_exception'

type RecordValue = Record<string, unknown>

export function asRecord(value: unknown): RecordValue {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw ValidationException.field('body', 'Request body must be an object')
  }
  return value as RecordValue
}

export function asJsonRecord(value: unknown): RecordValue {
  if (value === undefined) return {}
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw ValidationException.field('presentation', 'Presentation must be an object')
  }
  return value as RecordValue
}

export function readString(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw ValidationException.field('value', 'Value must be a non-empty string')
  }
  return value.trim()
}

export function readOptionalString(value: unknown): string | undefined {
  if (value === undefined) return undefined
  if (typeof value !== 'string') throw ValidationException.field('value', 'Value must be a string')
  return value.trim()
}

export function readNullableString(value: unknown): string | null {
  if (value === null || value === undefined) return null
  return readString(value)
}

export function readPositiveInt(value: unknown): number {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' && /^\d+$/u.test(value.trim()) ? Number(value) : Number.NaN
  if (!Number.isSafeInteger(parsed) || parsed < 1) throw ValidationException.field('value', 'Value must be a positive integer')
  return parsed
}

export function readVisibility(value: unknown): 'private' | 'team' | 'organization' {
  if (value === 'private' || value === 'team' || value === 'organization') return value
  throw ValidationException.field('visibility', 'Visibility is invalid')
}

export function readTimezone(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) throw ValidationException.field('timezone', 'Timezone is required')
  return value.trim()
}

export function readInterval(value: unknown): number {
  const interval = readPositiveInt(value)
  if (interval > 60 * 24 * 31) throw ValidationException.field('intervalMinutes', 'Interval is too large')
  return interval
}

export interface FilterCriteriaEnvelope {
  readonly context: string
  readonly schemaVersion: number
  readonly sort: readonly { readonly field: string; readonly direction: 'asc' | 'desc' }[]
  readonly page?: { readonly size: number; readonly cursor?: string; readonly offset?: number }
  readonly filter?: unknown
  readonly text?: { readonly value: string }
  readonly projection?: readonly string[]
  readonly preferences?: readonly unknown[]
  readonly requestedFacets?: readonly unknown[]
}

function isSortDirection(value: unknown): value is 'asc' | 'desc' {
  return value === 'asc' || value === 'desc'
}

export function readCriteria(value: unknown, requirePage = false): FilterCriteriaEnvelope {
  const body = asRecord(value)
  if (typeof body['context'] !== 'string' || body['context'].trim().length === 0) throw ValidationException.field('criteria.context', 'Context is required')
  const schemaVersion = readPositiveInt(body['schemaVersion'])
  const rawPage = body['page'] === undefined ? undefined : asRecord(body['page'])
  if (requirePage && rawPage === undefined) throw ValidationException.field('criteria.page', 'Page is required')
  const size = rawPage === undefined ? undefined : readPositiveInt(rawPage['size'])
  const cursor = rawPage?.['cursor']
  const offset = rawPage?.['offset']
  if (cursor !== undefined && offset !== undefined) throw ValidationException.field('criteria.page', 'Cursor and offset cannot be combined')
  if (cursor !== undefined && typeof cursor !== 'string') throw ValidationException.field('criteria.page.cursor', 'Cursor must be a string')
  if (offset !== undefined && (!Number.isSafeInteger(offset) || (offset as number) < 0)) throw ValidationException.field('criteria.page.offset', 'Offset must be a non-negative integer')
  const rawSort = body['sort'] === undefined ? [] : body['sort']
  if (!Array.isArray(rawSort)) throw ValidationException.field('criteria.sort', 'Sort must be an array')
  const sort = rawSort.map((entry, index) => {
    const item = asRecord(entry)
    const direction = item['direction']
    if (typeof item['field'] !== 'string' || !isSortDirection(direction)) throw ValidationException.field(`criteria.sort.${index}`, 'Sort entry is invalid')
    return { field: item['field'].trim(), direction }
  })
  return {
    context: body['context'].trim(), schemaVersion, sort,
    ...(size === undefined ? {} : { page: { size, ...(typeof cursor === 'string' ? { cursor } : {}), ...(offset === undefined ? {} : { offset: offset as number }) } }),
    ...(body['filter'] === undefined ? {} : { filter: body['filter'] }),
    ...(body['text'] === undefined ? {} : { text: body['text'] as { value: string } }),
    ...(body['projection'] === undefined ? {} : { projection: body['projection'] as string[] }),
    ...(body['preferences'] === undefined ? {} : { preferences: body['preferences'] as unknown[] }),
    ...(body['requestedFacets'] === undefined ? {} : { requestedFacets: body['requestedFacets'] as unknown[] }),
  }
}

export function semanticFromCriteria(criteria: FilterCriteriaEnvelope) {
  return { filter: criteria.filter ?? null, textQuery: criteria.text?.value ?? null, sort: [...criteria.sort], projection: [...(criteria.projection ?? [])] }
}
