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

export interface AccomplishmentUnpublicationRequestBody {
  readonly projectionId: string
  readonly publicationVersion: number
  readonly confirmed: boolean
}

export function buildAccomplishmentUnpublicationRequest(
  body: unknown
): AccomplishmentUnpublicationRequestBody {
  const input = record(body)
  const publicationVersion = input['publicationVersion']
  if (!Number.isSafeInteger(publicationVersion) || (publicationVersion as number) < 1) {
    invalid('publicationVersion')
  }
  const confirmed = input['confirmed']
  if (typeof confirmed !== 'boolean') invalid('confirmed')
  return {
    projectionId: text(input['projectionId'], 'projectionId', 128),
    publicationVersion: publicationVersion as number,
    confirmed,
  }
}
