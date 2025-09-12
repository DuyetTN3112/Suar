export interface ApiV1ProblemDetails {
  type: string
  title: string
  status: number
  detail: string
  code: string
  requestId: string
  correlationId: string
  errors?: Record<string, string>
}

function toProblemSlug(code: string): string {
  return code.replace(/^E_/, '').toLowerCase().replace(/_/g, '-')
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
    case 409:
      return 'Conflict'
    case 422:
      return 'Validation error'
    case 429:
      return 'Rate limit exceeded'
    default:
      return 'Internal server error'
  }
}

export function createApiV1ProblemDetails(input: {
  status: number
  code: string
  detail: string
  requestId: string
  correlationId: string
  errors?: Record<string, string>
}): ApiV1ProblemDetails {
  return {
    type: `https://docs.suar.dev/problems/${toProblemSlug(input.code)}`,
    title: getApiV1ProblemTitle(input.status),
    status: input.status,
    detail: input.detail,
    code: input.code,
    requestId: input.requestId,
    correlationId: input.correlationId,
    ...(input.errors && Object.keys(input.errors).length > 0 ? { errors: input.errors } : {}),
  }
}
