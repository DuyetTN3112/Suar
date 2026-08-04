import ValidationException from '#modules/errors/public_contracts/validation_exception'

export function buildTaskCreatePermissionRequest(request: { input(key: string): unknown }): string | undefined {
  const camel = request.input('projectId')
  const snake = request.input('project_id')
  if (camel !== undefined && snake !== undefined) throw ValidationException.field('projectId', 'Use either projectId or project_id, not both')
  const value = camel ?? snake
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value !== 'string' || value.trim() === '') throw ValidationException.field('projectId', 'projectId must be a string')
  return value.trim()
}
