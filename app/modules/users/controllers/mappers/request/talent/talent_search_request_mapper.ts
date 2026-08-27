import ValidationException from '#modules/errors/public_contracts/validation_exception'

interface RequestLike {
  input(key: string): unknown
}

function optionalText(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value !== 'string') throw ValidationException.field(field, `${field} must be a string`)
  const normalized = value.trim()
  if (normalized.length > 200) throw ValidationException.field(field, `${field} cannot exceed 200 characters`)
  return normalized || undefined
}

export function buildTalentSearchRequest(request: RequestLike): { q?: string; task_id?: string } {
  const rawTaskId = request.input('taskId') ?? request.input('task_id')
  const taskId = optionalText(rawTaskId, 'taskId')
  const result: { q?: string; task_id?: string } = {}
  const query = optionalText(request.input('q'), 'q')
  if (query !== undefined) result.q = query
  if (taskId !== undefined) result.task_id = taskId
  return result
}
