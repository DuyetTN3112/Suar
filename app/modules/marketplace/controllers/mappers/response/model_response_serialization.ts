export type SerializedModelRecord = object

export interface SerializableModelRecord {
  serialize(): SerializedModelRecord
}

export interface PaginationMeta {
  total: number
  per_page: number
  current_page: number
  last_page: number
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

function toCamelCaseKey(key: string): string {
  return key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())
}

export function camelizeResponseValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => camelizeResponseValue(item))
  }

  if (isSerializedModelRecord(value)) {
    const output: Record<string, unknown> = {}
    for (const [key, nestedValue] of Object.entries(value)) {
      output[toCamelCaseKey(key)] = camelizeResponseValue(nestedValue)
    }
    return output
  }

  return value
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
