export type ResponseRecord = object

export interface SerializableResponseRecord {
  serialize(): ResponseRecord
}

export interface PaginationMeta {
  total: number
  per_page: number
  current_page: number
  last_page: number
}

export interface PaginatedControllerResult<T extends SerializableResponseRecord | ResponseRecord> {
  data: T[]
  meta: PaginationMeta
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

export function serializeForResponse(
  value: SerializableResponseRecord | ResponseRecord
): ResponseRecord {
  if (isSerializableResponseRecord(value)) {
    return value.serialize()
  }

  return value
}

export function serializeCollectionForResponse(
  values: (SerializableResponseRecord | ResponseRecord)[]
): ResponseRecord[] {
  return values.map((value) => serializeForResponse(value))
}
