export type SerializedModelRecord = object

export interface SerializableModelRecord {
  serialize(): SerializedModelRecord
}

export interface PaginationMeta {
  total: number
  per_page: number
  current_page: number
  last_page: number
  cursor?: {
    next_cursor: string | null
    previous_cursor: string | null
    has_next_page: boolean
    has_previous_page: boolean
  }
}

export interface PaginatedControllerResult<T extends SerializableModelRecord | SerializedModelRecord> {
  data: T[]
  meta: PaginationMeta
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

export function serializeModelForHttpResponse(
  value: SerializableModelRecord | SerializedModelRecord
): SerializedModelRecord {
  if (isSerializableModelRecord(value)) {
    return value.serialize()
  }

  return value
}

export function serializeModelCollectionForHttpResponse(
  values: (SerializableModelRecord | SerializedModelRecord)[]
): SerializedModelRecord[] {
  return values.map((value) => serializeModelForHttpResponse(value))
}
