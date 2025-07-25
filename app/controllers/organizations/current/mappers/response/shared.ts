export type ResponseRecord = Record<string, unknown>

export interface SerializableResponseRecord {
  serialize(): ResponseRecord
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

export function serializeForCurrentOrganizationResponse(
  value: SerializableResponseRecord | ResponseRecord
): ResponseRecord {
  if (isSerializableResponseRecord(value)) {
    return value.serialize()
  }

  return value
}
