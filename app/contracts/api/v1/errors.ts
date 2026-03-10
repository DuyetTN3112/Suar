export interface ApiV1ProblemViolation {
  field: string
  pointer: string
  message: string
  code: string
}

export type ApiV1ProblemCategory =
  | 'validation'
  | 'authentication'
  | 'authorization'
  | 'not_found'
  | 'conflict'
  | 'rate_limit'
  | 'dependency'
  | 'internal'
  | 'business'

export interface ApiV1ProblemDetails {
  type: string
  title: string
  status: number
  detail: string
  instance: string
  code: string
  category: ApiV1ProblemCategory
  retryable: boolean
  requestId: string
  correlationId: string
  errors?: Record<string, string>
  violations?: ApiV1ProblemViolation[]
}

function categoryFromStatus(status: number): ApiV1ProblemCategory {
  switch (status) {
    case 401:
      return 'authentication'
    case 403:
      return 'authorization'
    case 404:
      return 'not_found'
    case 409:
      return 'conflict'
    case 422:
      return 'validation'
    case 429:
      return 'rate_limit'
    case 502:
    case 503:
    case 504:
      return 'dependency'
    case 400:
      return 'business'
    default:
      return 'internal'
  }
}

function toProblemSlug(code: string): string {
  return code.replace(/^E_/, '').toLowerCase().replace(/_/g, '-')
}

function toJsonPointer(field: string): string {
  const segments = field
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .filter(Boolean)
    .map((segment) => segment.replace(/~/g, '~0').replace(/\//g, '~1'))

  return `/${segments.join('/')}`
}

function createInstance(requestId: string): string {
  return `urn:suar:problem:${encodeURIComponent(requestId)}`
}

export function getApiV1ProblemTitle(status: number): string {
  switch (status) {
    case 400:
      return 'Bad request'
    case 401:
      return 'Unauthorized'
    case 403:
      return 'Forbidden'
    case 404:
      return 'Resource not found'
    case 405:
      return 'Method not allowed'
    case 408:
      return 'Request timeout'
    case 409:
      return 'Conflict'
    case 413:
      return 'Payload too large'
    case 415:
      return 'Unsupported media type'
    case 419:
      return 'Page expired'
    case 422:
      return 'Validation error'
    case 429:
      return 'Rate limit exceeded'
    case 502:
      return 'Bad gateway'
    case 503:
      return 'Service unavailable'
    case 504:
      return 'Gateway timeout'
    default:
      return status >= 400 && status < 500 ? 'Request failed' : 'Internal server error'
  }
}

export function createApiV1ProblemDetails(input: {
  status: number
  code: string
  detail: string
  category?: ApiV1ProblemCategory
  retryable?: boolean
  requestId: string
  correlationId: string
  errors?: Record<string, string>
  instance?: string
  violations?: ApiV1ProblemViolation[]
}): ApiV1ProblemDetails {
  const violations =
    input.violations ??
    (input.errors
      ? Object.entries(input.errors).map(([field, message]) => ({
          field,
          pointer: toJsonPointer(field),
          message,
          code: input.code,
        }))
      : undefined)

  return {
    type: `https://docs.suar.dev/problems/${toProblemSlug(input.code)}`,
    title: getApiV1ProblemTitle(input.status),
    status: input.status,
    detail: input.detail,
    instance: input.instance ?? createInstance(input.requestId),
    code: input.code,
    category: input.category ?? categoryFromStatus(input.status),
    // Retry safety is operation-specific. Status alone cannot prove a mutation
    // is safe to replay, so callers must opt in explicitly.
    retryable: input.retryable ?? false,
    requestId: input.requestId,
    correlationId: input.correlationId,
    ...(input.errors && Object.keys(input.errors).length > 0 ? { errors: input.errors } : {}),
    ...(violations && violations.length > 0 ? { violations } : {}),
  }
}
