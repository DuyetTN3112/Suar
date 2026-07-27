import ValidationException from '#modules/errors/public_contracts/validation_exception'
export function buildListActiveSkillsRequest(request: { input(key: string): unknown }): { q?: string } {
  const value = request.input('q')
  if (value === undefined || value === null || value === '') return {}
  if (typeof value !== 'string') throw ValidationException.field('q', 'q must be a string')
  const q = value.trim()
  if (q.length > 200) throw ValidationException.field('q', 'q cannot exceed 200 characters')
  return q ? { q } : {}
}
