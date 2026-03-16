import PersistedDataIntegrityException from '#modules/errors/public_contracts/persisted_data_integrity_exception'

export interface PersistedJsonArrayContext {
  readonly table: string
  readonly field: string
  readonly recordId: string
}

function corruption(
  context: PersistedJsonArrayContext,
  expectedShape: 'string_array' | 'object_array',
  reason: 'invalid_json' | 'unexpected_shape' | 'invalid_array_member',
  memberIndex?: number
): PersistedDataIntegrityException {
  return new PersistedDataIntegrityException(
    'Persisted data violates the JSON array contract required by the application',
    {
      table: context.table,
      record_id: context.recordId,
      field: context.field,
      expected_shape: expectedShape,
      reason,
      ...(memberIndex === undefined ? {} : { member_index: memberIndex }),
    }
  )
}

function decodeLegacyJsonString(
  value: unknown,
  context: PersistedJsonArrayContext,
  expectedShape: 'string_array' | 'object_array'
): unknown {
  if (typeof value !== 'string') {
    return value
  }

  try {
    return JSON.parse(value) as unknown
  } catch {
    throw corruption(context, expectedShape, 'invalid_json')
  }
}

export function parsePersistedStringArray(
  value: unknown,
  context: PersistedJsonArrayContext
): string[] {
  const expectedShape = 'string_array'
  const decoded = decodeLegacyJsonString(value, context, expectedShape)
  if (!Array.isArray(decoded)) {
    throw corruption(context, expectedShape, 'unexpected_shape')
  }

  const invalidMemberIndex = decoded.findIndex((item) => typeof item !== 'string')
  if (invalidMemberIndex >= 0) {
    throw corruption(context, expectedShape, 'invalid_array_member', invalidMemberIndex)
  }

  return decoded as string[]
}

export function parsePersistedObjectArray(
  value: unknown,
  context: PersistedJsonArrayContext
): Record<string, unknown>[] {
  const expectedShape = 'object_array'
  const decoded = decodeLegacyJsonString(value, context, expectedShape)
  if (!Array.isArray(decoded)) {
    throw corruption(context, expectedShape, 'unexpected_shape')
  }

  const invalidMemberIndex = decoded.findIndex(
    (item) => typeof item !== 'object' || item === null || Array.isArray(item)
  )
  if (invalidMemberIndex >= 0) {
    throw corruption(context, expectedShape, 'invalid_array_member', invalidMemberIndex)
  }

  return decoded as Record<string, unknown>[]
}
