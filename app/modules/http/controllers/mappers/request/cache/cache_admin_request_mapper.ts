import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { validationIssue } from '#modules/errors/public_contracts/validation_issue'

export interface SetCacheValueRequest {
  readonly key: string
  readonly value: unknown
  readonly ttl: number
}

function readString(value: unknown, path: string) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw ValidationException.fromIssues([
      validationIssue(path, `${path} is required`, 'REQUEST_STRING_REQUIRED'),
    ])
  }
  return value.trim()
}

export function buildSetCacheValueRequest(payload: unknown): SetCacheValueRequest {
  const body = payload && typeof payload === 'object' && !Array.isArray(payload)
    ? payload as Record<string, unknown>
    : {}
  const key = readString(body['key'], 'key')
  const ttl = body['ttl'] === undefined ? 3600 : body['ttl']
  if (typeof ttl !== 'number' || !Number.isSafeInteger(ttl)) {
    throw ValidationException.fromIssues([
      validationIssue('ttl', 'ttl must be a safe integer', 'REQUEST_INTEGER_INVALID'),
    ])
  }
  if (body['value'] === undefined) {
    throw ValidationException.fromIssues([
      validationIssue('value', 'value is required', 'REQUEST_VALUE_REQUIRED'),
    ])
  }
  return { key, value: body['value'], ttl }
}

export function buildCacheKeyRequest(params: unknown) {
  const body = params && typeof params === 'object' && !Array.isArray(params)
    ? params as Record<string, unknown>
    : {}
  return { key: readString(body['key'], 'key') }
}

export function buildFlushCacheRequest(input: unknown) {
  return { confirmation: readString(input, 'confirmation') }
}
