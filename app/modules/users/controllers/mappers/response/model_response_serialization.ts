import { normalizeLegacySnakePagination } from '#modules/pagination/public_contracts/pagination_public_api'

export type SerializedModelRecord = object

export interface SerializableModelRecord {
  serialize(): SerializedModelRecord
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

function isSerializedModelRecord(value: unknown): value is SerializedModelRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isSerializableModelRecord(value: unknown): value is SerializableModelRecord {
  return (
    isSerializedModelRecord(value) &&
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

export function serializeModelForHttpResponse(
  value: SerializableModelRecord | SerializedModelRecord
): SerializedModelRecord {
  if (isSerializableModelRecord(value)) {
    return value.serialize()
  }

  return value
}

export function serializeNullableModelForHttpResponse(
  value: SerializableModelRecord | SerializedModelRecord | null
): SerializedModelRecord | null {
  return value ? serializeModelForHttpResponse(value) : null
}

export function serializeModelCollectionForHttpResponse(values: unknown[]): SerializedModelRecord[] {
  return values
    .filter((value): value is SerializableModelRecord | SerializedModelRecord =>
      isSerializedModelRecord(value)
    )
    .map((value) => serializeModelForHttpResponse(value))
}

export function normalizePaginationMeta(meta: PaginationMetaLike) {
  return normalizeLegacySnakePagination({
    total: readNumber(meta.total) ?? 0,
    per_page: readNumber(meta.per_page ?? meta.perPage) ?? 0,
    current_page: readNumber(meta.current_page ?? meta.currentPage) ?? 1,
    last_page: readNumber(meta.last_page ?? meta.lastPage) ?? 1,
  })
}

export function sanitizePublicSnapshot(snapshot: SerializableModelRecord | SerializedModelRecord) {
  return stripUndefined({
    ...serializeModelForHttpResponse(snapshot),
    shareable_token: undefined,
    shareableToken: undefined,
  })
}
