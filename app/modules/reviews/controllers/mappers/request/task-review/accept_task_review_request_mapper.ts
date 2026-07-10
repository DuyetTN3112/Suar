import ValidationException from '#modules/errors/public_contracts/validation_exception'

export function buildAcceptTaskReviewRequest(request: { input(key: string): unknown }) {
  return buildTaskReviewRedirectRequest(request)
}

export function buildTaskReviewRedirectRequest(request: { input(key: string): unknown }) {
  const value = request.input('redirect_to')
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value !== 'string' || value.length > 1000) throw ValidationException.field('redirect_to', 'redirect_to must be a string no longer than 1000 characters')
  return value
}
