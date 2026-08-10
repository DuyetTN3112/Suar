import ValidationException from '#modules/errors/public_contracts/validation_exception'

function requiredId(params: unknown, key: string): string {
  const value =
    params && typeof params === 'object' && !Array.isArray(params)
      ? (params as Record<string, unknown>)[key]
      : undefined
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw ValidationException.field(key, `${key} is required`)
  }
  return value.trim()
}

export function buildTaskRequirementRouteRequest(params: unknown): { taskId?: string; requirementId?: string } {
  const values: { taskId?: string; requirementId?: string } = {}
  if (params && typeof params === 'object' && !Array.isArray(params)) {
    const record = params as Record<string, unknown>
    if (record['taskId'] !== undefined) values.taskId = requiredId(params, 'taskId')
    if (record['requirementId'] !== undefined) values.requirementId = requiredId(params, 'requirementId')
  }
  return values
}

export function buildRequiredTaskRequirementRouteRequest(params: unknown): { requirementId: string } {
  return { requirementId: requiredId(params, 'requirementId') }
}

export function buildRequiredTaskRouteRequest(params: unknown): { taskId: string } {
  return { taskId: requiredId(params, 'taskId') }
}
