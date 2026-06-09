import ValidationException from '#modules/errors/public_contracts/validation_exception'

export function buildTaskRedirectRequest(request: { input(key: string): unknown }, sessionProjectId: unknown): { projectId: string | null } {
  const raw = request.input('project_id') ?? sessionProjectId
  if (raw === undefined || raw === null || raw === '') return { projectId: null }
  if (typeof raw !== 'string' || raw.trim() === '') throw ValidationException.field('project_id', 'project_id must be a string')
  return { projectId: raw.trim() }
}
