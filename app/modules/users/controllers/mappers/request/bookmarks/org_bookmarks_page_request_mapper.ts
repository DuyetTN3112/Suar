import ValidationException from '#modules/errors/public_contracts/validation_exception'

function text(request: { input(key: string): unknown }, key: string): string | undefined {
  const value = request.input(key)
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value !== 'string') throw ValidationException.field(key, `${key} must be a string`)
  const result = value.trim()
  if (result.length > 200) throw ValidationException.field(key, `${key} cannot exceed 200 characters`)
  return result || undefined
}

export function buildOrgBookmarksPageRequest(request: { input(key: string): unknown }) {
  const rawPage = request.input('page')
  const rawPerPage = request.input('perPage') ?? request.input('per_page') ?? request.input('limit')
  const integer = (value: unknown, field: string, fallback: number) => {
    if (value === undefined) return fallback
    const result = typeof value === 'string' && /^\d+$/.test(value.trim()) ? Number(value) : typeof value === 'number' ? value : Number.NaN
    if (!Number.isSafeInteger(result) || result < 1 || result > 100) throw ValidationException.field(field, `${field} must be an integer between 1 and 100`)
    return result
  }
  return { q: text(request, 'q'), folder: text(request, 'folder'), page: integer(rawPage, 'page', 1), per_page: integer(rawPerPage, 'perPage', 10) }
}
