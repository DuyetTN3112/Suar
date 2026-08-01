export type ApiProblemRecovery =
  | 'none'
  | 'reauthenticate'
  | 'refresh_csrf'
  | 'refresh_state'
  | 'retry_after'
  | 'retry'

export interface NormalizedApiProblem {
  readonly status: number | null
  readonly code: string
  readonly category: string | null
  readonly title: string
  readonly detail: string
  readonly type: string | null
  readonly requestId: string | null
  readonly correlationId: string | null
  readonly fieldErrors: Record<string, string>
  readonly retryAfterSeconds: number | null
  readonly retryable: boolean
  readonly recovery: ApiProblemRecovery
  readonly networkError: boolean
  readonly timedOut: boolean
  readonly canceled: boolean
}

const FALLBACK_DETAIL = 'Unable to complete the request. Please try again.'
const NETWORK_DETAIL = 'Unable to reach the server. Check your connection and try again.'
const TIMEOUT_DETAIL = 'The request took too long. Please try again when it is safe to do so.'
const CANCELED_DETAIL = 'The request was canceled.'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNormalizedApiProblem(value: unknown): value is NormalizedApiProblem {
  if (!isRecord(value)) return false

  return (
    typeof value['code'] === 'string' &&
    typeof value['title'] === 'string' &&
    typeof value['detail'] === 'string' &&
    typeof value['retryable'] === 'boolean' &&
    typeof value['networkError'] === 'boolean' &&
    typeof value['timedOut'] === 'boolean' &&
    typeof value['canceled'] === 'boolean'
  )
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function asHeaderString(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }
  return asString(value)
}

function asStatus(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 100 && value <= 599
    ? value
    : null
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null
}

function flattenFieldErrors(
  value: unknown,
  prefix = '',
  output: Record<string, string> = {}
): Record<string, string> {
  if (!isRecord(value)) return output

  for (const [key, entry] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key
    const message = asString(entry)
    if (message) {
      output[path] = message
      continue
    }

    if (Array.isArray(entry)) {
      const firstMessage = entry.map(asString).find((item): item is string => item !== null)
      if (firstMessage) output[path] = firstMessage
      continue
    }

    flattenFieldErrors(entry, path, output)
  }

  return output
}

function readHeader(headers: unknown, name: string): string | null {
  if (!isRecord(headers)) return null

  const direct = headers[name] ?? headers[name.toLowerCase()]
  if (direct !== undefined) return asHeaderString(direct)

  const normalizedName = name.toLowerCase()
  for (const [headerName, headerValue] of Object.entries(headers)) {
    if (headerName.toLowerCase() === normalizedName) {
      return asHeaderString(headerValue)
    }
  }

  const getter = headers['get']
  if (typeof getter === 'function') {
    return asHeaderString(getter.call(headers, name))
  }

  return null
}

function parseRetryAfterSeconds(headers: unknown): number | null {
  const value = readHeader(headers, 'retry-after')
  if (!value) return null

  const seconds = Number(value)
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.ceil(seconds)
  }

  const retryAt = Date.parse(value)
  if (!Number.isFinite(retryAt)) return null
  return Math.max(0, Math.ceil((retryAt - Date.now()) / 1_000))
}

function recoveryForStatus(status: number | null, retryable: boolean): ApiProblemRecovery {
  switch (status) {
    case null:
      return retryable ? 'retry' : 'none'
    case 401:
      return 'reauthenticate'
    case 409:
      return 'refresh_state'
    case 419:
      return 'refresh_csrf'
    case 429:
      return retryable ? 'retry_after' : 'none'
    default:
      return retryable ? 'retry' : 'none'
  }
}

function titleForStatus(status: number | null): string {
  switch (status) {
    case null:
      return 'Request failed'
    case 401:
      return 'Authentication required'
    case 403:
      return 'Forbidden'
    case 404:
      return 'Resource not found'
    case 409:
      return 'Conflict'
    case 419:
      return 'Page expired'
    case 422:
      return 'Validation error'
    case 429:
      return 'Rate limit exceeded'
    default:
      return status >= 500 ? 'Service unavailable' : 'Request failed'
  }
}

function requestAllowsTransportRetry(error: Record<string, unknown>): boolean {
  const config = isRecord(error['config']) ? error['config'] : null
  const method = asString(config?.['method'])?.toUpperCase()
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return true
  }

  return readHeader(config?.['headers'], 'idempotency-key') !== null
}

export function normalizeApiProblem(error: unknown): NormalizedApiProblem {
  const errorRecord = isRecord(error) ? error : {}
  const attachedProblem = errorRecord['apiProblem']
  if (isNormalizedApiProblem(attachedProblem)) {
    return attachedProblem
  }

  const response = isRecord(errorRecord['response']) ? errorRecord['response'] : null
  const data = response && isRecord(response['data']) ? response['data'] : null
  const nestedError = data && isRecord(data['error']) ? data['error'] : null
  const status = asStatus(response?.['status']) ?? asStatus(data?.['status'])
  const errorCode = asString(errorRecord['code'])
  const canceled =
    errorCode === 'ERR_CANCELED' || asString(errorRecord['message'])?.toLowerCase() === 'canceled'
  const timedOut = errorCode === 'ECONNABORTED' || errorCode === 'ETIMEDOUT'
  const networkError = response === null && !canceled
  const code =
    asString(data?.['code']) ??
    asString(nestedError?.['code']) ??
    (timedOut
      ? 'E_CLIENT_TIMEOUT'
      : networkError
        ? 'E_NETWORK'
        : canceled
          ? 'E_CANCELED'
          : 'E_UNKNOWN')
  const canonicalDetail = asString(data?.['detail'])
  const compatDetail = asString(nestedError?.['message']) ?? asString(data?.['message'])
  const detail =
    status !== null && status >= 500
      ? FALLBACK_DETAIL
      : (canonicalDetail ??
        compatDetail ??
        (timedOut
          ? TIMEOUT_DETAIL
          : networkError
            ? NETWORK_DETAIL
            : canceled
              ? CANCELED_DETAIL
              : FALLBACK_DETAIL))
  const retryAfterSeconds = parseRetryAfterSeconds(response?.['headers'])
  const serverRetryable = asBoolean(data?.['retryable']) ?? asBoolean(nestedError?.['retryable'])
  const legacyStatusRetryable =
    status === 429 ||
    ((status === 502 || status === 503 || status === 504) &&
      requestAllowsTransportRetry(errorRecord))
  const transportRetryable = networkError && requestAllowsTransportRetry(errorRecord)
  const retryable =
    !canceled &&
    requestAllowsTransportRetry(errorRecord) &&
    (serverRetryable ?? (legacyStatusRetryable || transportRetryable))
  const recovery = recoveryForStatus(status, retryable)

  return {
    status,
    code,
    category: asString(data?.['category']) ?? asString(nestedError?.['category']),
    title: asString(data?.['title']) ?? titleForStatus(status),
    detail,
    type: asString(data?.['type']),
    requestId:
      asString(data?.['requestId']) ??
      asString(data?.['request_id']) ??
      (isRecord(data?.['meta']) ? asString(data['meta']['request_id']) : null),
    correlationId:
      asString(data?.['correlationId']) ??
      asString(data?.['correlation_id']) ??
      (isRecord(data?.['meta']) ? asString(data['meta']['correlation_id']) : null),
    fieldErrors: flattenFieldErrors(data?.['errors'] ?? nestedError?.['errors']),
    retryAfterSeconds,
    retryable,
    recovery,
    networkError,
    timedOut,
    canceled,
  }
}

export function apiProblemFromError(error: unknown): NormalizedApiProblem | null {
  if (!isRecord(error)) return null
  const problem = error['apiProblem']
  return isNormalizedApiProblem(problem) ? problem : null
}

/**
 * Signals a successful HTTP response whose payload violates the client contract.
 * The attached normalized problem keeps UI handling deterministic without
 * exposing response contents.
 */
export class ApiResponseContractError extends Error {
  readonly apiProblem: NormalizedApiProblem

  constructor() {
    super('The server returned an unexpected response.')
    this.name = 'ApiResponseContractError'
    this.apiProblem = {
      status: null,
      code: 'E_RESPONSE_SCHEMA',
      category: 'internal',
      title: 'Unexpected server response',
      detail: 'The server returned an unexpected response. Please try again.',
      type: null,
      requestId: null,
      correlationId: null,
      fieldErrors: {},
      retryAfterSeconds: null,
      retryable: true,
      recovery: 'retry',
      networkError: false,
      timedOut: false,
      canceled: false,
    }
  }
}
