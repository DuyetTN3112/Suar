import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { validationIssue } from '#modules/errors/public_contracts/validation_issue'

export function buildNotificationRouteRequest(params: unknown): {
  readonly notificationId: string
} {
  const value =
    params && typeof params === 'object' && !Array.isArray(params)
      ? (params as Record<string, unknown>)['notificationId']
      : undefined

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw ValidationException.fromIssues([
      validationIssue(
        'notificationId',
        'notificationId is required',
        'ROUTE_PARAMETER_REQUIRED'
      ),
    ])
  }

  return { notificationId: value.trim() }
}
