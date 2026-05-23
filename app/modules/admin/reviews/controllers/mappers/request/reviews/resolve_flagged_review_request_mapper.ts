import ValidationException from '#modules/errors/public_contracts/validation_exception'

interface ResolveFlaggedReviewRequest {
  flaggedReviewId: string
  action: 'dismiss' | 'confirm'
  notes: string
}

function asRecord(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw ValidationException.field(field, `${field} must be an object`)
  }
  return value as Record<string, unknown>
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw ValidationException.field(field, `${field} is required`)
  }
  return value.trim()
}

export function buildResolveFlaggedReviewRequest(
  params: unknown,
  body: unknown
): ResolveFlaggedReviewRequest {
  const routeParams = asRecord(params, 'params')
  const payload = asRecord(body, 'body')
  const action = payload['action'] ?? 'confirm'
  if (action !== 'confirm' && action !== 'dismiss') {
    throw ValidationException.field('action', 'Invalid resolve action')
  }

  return {
    flaggedReviewId: requiredString(routeParams['flaggedReviewId'], 'flaggedReviewId'),
    action,
    notes: requiredString(payload['notes'], 'notes'),
  }
}
