import ValidationException from '#modules/errors/public_contracts/validation_exception'

export interface UpdatePackageRequestSource {
  params: unknown
  body: unknown
}

export interface UpdatePackageRequest {
  subscriptionId: string
  plan?: string
  status?: string
  auto_renew?: boolean
  expires_at?: string | null
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

function optionalString(
  body: Record<string, unknown>,
  field: string,
  alias: string = field
): string | undefined {
  const hasField = Object.hasOwn(body, field) || Object.hasOwn(body, alias)
  if (!hasField) return undefined

  const value = body[field] ?? body[alias]
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw ValidationException.field(field, `${field} must be a non-empty string`)
  }
  return value.trim()
}

export function buildUpdatePackageRequest(
  source: UpdatePackageRequestSource
): UpdatePackageRequest {
  const params = asRecord(source.params, 'params')
  const body = asRecord(source.body, 'body')
  const result: UpdatePackageRequest = {
    subscriptionId: requiredString(params['subscriptionId'], 'subscriptionId'),
  }

  const plan = optionalString(body, 'plan')
  const status = optionalString(body, 'status')
  if (plan !== undefined) result.plan = plan
  if (status !== undefined) result.status = status

  const hasAutoRenew = Object.hasOwn(body, 'autoRenew') || Object.hasOwn(body, 'auto_renew')
  if (hasAutoRenew) {
    const value = body['autoRenew'] ?? body['auto_renew']
    if (typeof value !== 'boolean') {
      throw ValidationException.field('autoRenew', 'autoRenew must be a boolean')
    }
    result.auto_renew = value
  }

  const hasExpiresAt = Object.hasOwn(body, 'expiresAt') || Object.hasOwn(body, 'expires_at')
  if (hasExpiresAt) {
    const value = body['expiresAt'] ?? body['expires_at']
    if (value !== null && (typeof value !== 'string' || value.trim().length === 0)) {
      throw ValidationException.field('expiresAt', 'expiresAt must be a string or null')
    }
    result.expires_at = value === null ? null : value.trim()
  }

  return result
}
