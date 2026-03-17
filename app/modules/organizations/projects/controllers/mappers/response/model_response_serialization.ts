export type SerializedModelRecord = object

export interface SerializableModelRecord {
  serialize(): SerializedModelRecord
}

function isSerializedModelRecord(value: unknown): value is SerializedModelRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function toCamelCaseKey(key: string): string {
  return key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())
}

function isSerializableModelRecord(value: unknown): value is SerializableModelRecord {
  return (
    isSerializedModelRecord(value) &&
    'serialize' in value &&
    typeof (value as { serialize?: unknown }).serialize === 'function'
  )
}

export function serializeForCurrentOrganizationResponse(
  value: SerializableModelRecord | SerializedModelRecord
): SerializedModelRecord {
  if (isSerializableModelRecord(value)) {
    return value.serialize()
  }

  return value
}

export function camelizeCurrentOrganizationResponseValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => camelizeCurrentOrganizationResponseValue(item))
  }

  if (isSerializedModelRecord(value)) {
    const output: Record<string, unknown> = {}

    for (const [key, nestedValue] of Object.entries(value)) {
      output[toCamelCaseKey(key)] = camelizeCurrentOrganizationResponseValue(nestedValue)
    }

    return output
  }

  return value
}
