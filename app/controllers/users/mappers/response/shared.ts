export type ResponseRecord = object

export interface SerializableResponseRecord {
  serialize(): ResponseRecord
}

interface PaginationMetaLike {
  total?: unknown
  perPage?: unknown
  currentPage?: unknown
  lastPage?: unknown
  per_page?: unknown
  current_page?: unknown
  last_page?: unknown
}

function isResponseRecord(value: unknown): value is ResponseRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isSerializableResponseRecord(value: unknown): value is SerializableResponseRecord {
  return (
    isResponseRecord(value) &&
    'serialize' in value &&
    typeof (value as { serialize?: unknown }).serialize === 'function'
  )
}

function readNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

export function stripUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  ) as T
}

export function serializeForResponse(
  value: SerializableResponseRecord | ResponseRecord
): ResponseRecord {
  if (isSerializableResponseRecord(value)) {
    return value.serialize()
  }

  return value
}

export function serializeNullableForResponse(
  value: SerializableResponseRecord | ResponseRecord | null
): ResponseRecord | null {
  return value ? serializeForResponse(value) : null
}

export function serializeCollectionForResponse(values: unknown[]): ResponseRecord[] {
  return values
    .filter((value): value is SerializableResponseRecord | ResponseRecord =>
      isResponseRecord(value)
    )
    .map((value) => serializeForResponse(value))
}

export function normalizePaginationMeta(meta: PaginationMetaLike) {
  return {
    total: readNumber(meta.total) ?? 0,
    per_page: readNumber(meta.per_page ?? meta.perPage) ?? 0,
    current_page: readNumber(meta.current_page ?? meta.currentPage) ?? 1,
    last_page: readNumber(meta.last_page ?? meta.lastPage) ?? 1,
  }
}

export function sanitizePublicSnapshot(snapshot: SerializableResponseRecord | ResponseRecord) {
  return stripUndefined({
    ...serializeForResponse(snapshot),
    shareable_token: undefined,
  })
}
