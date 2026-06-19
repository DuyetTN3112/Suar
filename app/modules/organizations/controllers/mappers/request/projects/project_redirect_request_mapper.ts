import ValidationException from '#modules/errors/public_contracts/validation_exception'

export function buildProjectRedirectRequest(params: Record<string, unknown>, request: { input(key: string): unknown }) {
  const projectId = params['projectId']
  if (typeof projectId !== 'string' || projectId.trim() === '') throw ValidationException.field('projectId', 'projectId is required')
  const rawFocus = request.input('focus')
  if (rawFocus === undefined || rawFocus === null || rawFocus === '') return { projectId: projectId.trim() }
  if (typeof rawFocus !== 'string') throw ValidationException.field('focus', 'focus must be a string')
  if (rawFocus.length > 100) throw ValidationException.field('focus', 'focus cannot exceed 100 characters')
  return { projectId: projectId.trim(), focus: rawFocus }
}
