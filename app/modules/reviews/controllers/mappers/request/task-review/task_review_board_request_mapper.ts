import ValidationException from '#modules/errors/public_contracts/validation_exception'
function id(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value !== 'string' || value.trim() === '') throw ValidationException.field(field, `${field} must be a string`)
  return value.trim()
}
export function buildTaskReviewBoardRequest(params: unknown, request: { input(key: string): unknown }, sessionProjectId: unknown) {
  const routeProjectId = id(params && typeof params === 'object' && !Array.isArray(params) ? (params as Record<string, unknown>)['projectId'] : undefined, 'projectId')
  const queryProjectId = id(request.input('project_id'), 'project_id')
  const sessionId = id(sessionProjectId, 'sessionProjectId')
  const projectId = routeProjectId ?? queryProjectId ?? sessionId ?? null
  const requestedTaskId = id(request.input('task_id'), 'task_id') ?? null
  return { routeProjectId, projectId, requestedTaskId, workspaceMode: routeProjectId ? 'project' as const : 'personal' as const }
}
