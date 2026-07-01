export type SerializedModelRecord = object

export interface SerializableModelRecord {
  serialize(): SerializedModelRecord
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
