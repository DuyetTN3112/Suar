import ValidationException from '#modules/errors/public_contracts/validation_exception'

interface RequestLike {
  input(key: string): unknown
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw ValidationException.field(field, `${field} is required`)
  }
  return value.trim()
}

export function buildMemberCandidatesRequest(
  params: Record<string, unknown>,
  request: RequestLike
): { project_id: string; search?: string } {
  const projectId = requiredString(params['projectId'], 'projectId')
  const rawSearch = request.input('search')
  if (rawSearch === undefined || rawSearch === null || rawSearch === '') {
    return { project_id: projectId }
  }
  if (typeof rawSearch !== 'string') {
    throw ValidationException.field('search', 'search must be a string')
  }
  const search = rawSearch.trim()
  if (search.length > 200) {
    throw ValidationException.field('search', 'search cannot exceed 200 characters')
  }
  return search.length > 0 ? { project_id: projectId, search } : { project_id: projectId }
}
