import ValidationException from '#modules/errors/public_contracts/validation_exception'

interface RecordBody {
  [key: string]: unknown
}

function invalid(field: string): never {
  throw ValidationException.field(field, `${field} is invalid.`)
}

function record(value: unknown): RecordBody {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) invalid('request')
  return value as RecordBody
}

function text(value: unknown, field: string, max: number): string {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > max) invalid(field)
  return value
}

export interface AccomplishmentPublicationRequestBody {
  readonly idempotencyKey: string
  readonly expectedSourceCanonicalHash: string
  readonly expectedLifecycleRevisionId: string
  readonly confirmed: boolean
}

export function buildAccomplishmentPublicationRequest(
  body: unknown
): AccomplishmentPublicationRequestBody {
  const input = record(body)
  const expectedSourceCanonicalHash = text(
    input['expectedSourceCanonicalHash'],
    'expectedSourceCanonicalHash',
    71
  )
  if (!/^sha256:[0-9a-f]{64}$/.test(expectedSourceCanonicalHash)) {
    invalid('expectedSourceCanonicalHash')
  }
  const confirmed = input['confirmed']
  if (typeof confirmed !== 'boolean') invalid('confirmed')
  return {
    idempotencyKey: text(input['idempotencyKey'], 'idempotencyKey', 200),
    expectedSourceCanonicalHash,
    expectedLifecycleRevisionId: text(
      input['expectedLifecycleRevisionId'],
      'expectedLifecycleRevisionId',
      64
    ),
    confirmed,
  }
}
