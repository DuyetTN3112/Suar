import ValidationException from '#modules/errors/public_contracts/validation_exception'
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw ValidationException.field('params', 'params must be an object')
  return value as Record<string, unknown>
}
function id(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value !== 'string' || value.trim() === '') throw ValidationException.field(field, `${field} must be a string`)
  return value.trim()
}
export function buildSprintBoardRequest(params: unknown, request: { input(key: string): unknown }) {
  const route = record(params)
  const projectId = id(route['projectId'], 'projectId')
  if (!projectId) throw ValidationException.field('projectId', 'projectId is required')
  const a = request.input('projectSprintId'); const b = request.input('project_sprint_id')
  if (a !== undefined && b !== undefined) throw ValidationException.field('projectSprintId', 'aliases conflict')
  const sprintId = id(a ?? b, 'projectSprintId')
  return { project_id: projectId, ...(sprintId === undefined ? {} : { project_sprint_id: sprintId }) }
}
